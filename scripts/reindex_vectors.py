#!/usr/bin/env python3
"""Reindex vectors in Qdrant collection.

This script scans points in a collection, extracts text from point payloads
(or from `_node_content`), computes embeddings (via `fastembed.TextEmbedding` by default),
and upserts vectors into Qdrant in batches.

Usage:
  source .venv/bin/activate
  pip install fastembed qdrant-client
  python scripts/reindex_vectors.py --collection knowledge_base_civipedia --batch 128

Options:
  --collection: Qdrant collection name
  --batch: batch size for upsert
  --limit: maximum number of points to process (for testing)
  --dry-run: do not write to Qdrant, only show counts

Be careful: this writes vectors into your Qdrant cluster. Run on dev first.
"""

import argparse
import json
import logging
from typing import Optional

# Ensure project root is on sys.path so we can import test_civi3 when running from scripts/
import sys
from pathlib import Path
PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

try:
    from test_civi3 import get_qdrant_client, model_name
except Exception as e:
    raise ImportError("Could not import test_civi3. Run this script from the project root or ensure the project is on PYTHONPATH.") from e

logger = logging.getLogger("reindex")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")


def extract_text_from_payload(payload: dict) -> Optional[str]:
    # Common places where text may live
    if not payload:
        return None
    # If payload contains a precomputed node content as JSON string
    node_content = payload.get("_node_content") or payload.get("node_content")
    if isinstance(node_content, str):
        try:
            obj = json.loads(node_content)
            text = obj.get("text")
            if text:
                return text
        except Exception:
            pass
    # direct text fields
    for key in ("text", "content", "_text", "_node_text"):
        if key in payload and isinstance(payload[key], str):
            return payload[key]
    # fallback: join other string payload values
    arr = [str(v) for v in payload.values() if isinstance(v, str) and len(v) > 20]
    if arr:
        return "\n\n".join(arr)
    return None


def compute_embeddings(texts, model_name_local=None):
    """Compute embeddings for a list of texts. Tries fastembed, otherwise raises."""
    try:
        from fastembed.text import TextEmbedding
    except Exception as e:
        logger.error("fastembed not available: %s", e)
        raise

    # try to instantiate the requested model first
    try:
        if model_name_local:
            fe = TextEmbedding(model_name=model_name_local)
        else:
            fe = TextEmbedding()
    except Exception:
        logger.info("Requested fastembed model not available; falling back to default TextEmbedding()")
        fe = TextEmbedding()

    # fastembed.TextEmbedding exposes `embed`, `query_embed` and `passage_embed`.
    # Use `embed` which accepts a list of texts and returns a list-like of vectors.
    try:
        result = fe.embed(texts)
        return list(result)
    except AttributeError:
        # older/newer versions may expose only `query_embed` for single items
        vecs = []
        for t in texts:
            # `query_embed` may return a single vector
            v = fe.query_embed(t)
            vecs.append(v)
        return vecs


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--collection", required=True)
    p.add_argument("--batch", type=int, default=128)
    p.add_argument("--limit", type=int, default=0, help="max points to process (0 = all)")
    p.add_argument("--dry-run", action="store_true")
    args = p.parse_args()

    qc = get_qdrant_client()
    coll = args.collection
    batch = args.batch
    limit = args.limit
    dry = args.dry_run

    logger.info("Scanning collection '%s' (batch=%s, limit=%s, dry=%s)", coll, batch, limit, dry)

    # Use scroll to iterate points with payload
    processed = 0
    to_upsert = []

    try:
        # qdrant_client.scroll returns generator or list depending on version
        it = qc.scroll(collection_name=coll, with_payload=True, limit=batch)
    except TypeError:
        # older/newer client versions have different arg names; try without limit
        it = qc.scroll(collection_name=coll, with_payload=True)

    # If the client returns an iterable over batches, we need to handle accordingly.
    # We'll collect points into a flat list and process in chunks of `batch`.
    flat_points = []

    try:
        if hasattr(it, "__iter__") and not isinstance(it, dict):
            for pnt in it:
                # Sometimes scroll yields a batch (list) of points per iteration.
                if isinstance(pnt, (list, tuple)):
                    for inner in pnt:
                        flat_points.append(inner)
                        if limit and len(flat_points) >= limit:
                            break
                else:
                    flat_points.append(pnt)
                if limit and len(flat_points) >= limit:
                    break
        else:
            # single value (could be list)
            if isinstance(it, (list, tuple)):
                flat_points = list(it)[: limit or None]
            else:
                flat_points = [it]
    except Exception as e:
        logger.error("Error iterating scroll results: %s", e)
        return

    logger.info("Collected %d points to inspect", len(flat_points))

    # Build list of (id, text, payload) to embed only when embedding missing
    to_embed = []
    def normalize_point(pt):
        # Return a dict with keys 'id' and 'payload'
        try:
            # object with attributes
            if hasattr(pt, "id") or hasattr(pt, "payload"):
                return {"id": getattr(pt, "id", None), "payload": getattr(pt, "payload", None) or {}}
            # dict-like
            if isinstance(pt, dict):
                return {"id": pt.get("id") or pt.get("point_id") or pt.get("_id"), "payload": pt.get("payload") or {}}
            # list/tuple: try first element
            if isinstance(pt, (list, tuple)) and len(pt) > 0:
                return normalize_point(pt[0])
        except Exception:
            pass
        return {"id": None, "payload": {}}

    for pt in flat_points:
        norm = normalize_point(pt)
        pid = norm.get("id")
        payload = norm.get("payload") or {}
        # Try to detect stored embedding in payload or node content
        embedding_present = False
        try:
            # _node_content may contain embedding field inside JSON
            nc = payload.get("_node_content")
            if isinstance(nc, str) and "embedding" in nc:
                if '"embedding": null' not in nc:
                    embedding_present = True
        except Exception:
            pass
        # Some points may store vectors separately (qc stores vectors in separate fields)
        # We can't reliably detect here; we'll optimistically process those without embedding_present
        if not embedding_present:
            text = extract_text_from_payload(payload)
            if text:
                to_embed.append((pid, text, payload))

    logger.info("Need to compute embeddings for %d points", len(to_embed))

    # Process in batches
    from qdrant_client import models

    for i in range(0, len(to_embed), batch):
        chunk = to_embed[i : i + batch]
        ids = [x[0] for x in chunk]
        texts = [x[1] for x in chunk]
        payloads = [x[2] for x in chunk]

        logger.info("Computing embeddings for batch %d..%d", i + 1, i + len(chunk))
        try:
            vecs = compute_embeddings(texts, model_name_local=model_name)
        except Exception as e:
            logger.error("Failed to compute embeddings: %s", e)
            return

        points = []
        for pid, vec, payload in zip(ids, vecs, payloads):
            # ensure list/tuple
            v = vec.tolist() if hasattr(vec, "tolist") else list(vec)
            # keep existing payload
            points.append(models.PointStruct(id=pid, vector=v, payload=payload))

        logger.info("Prepared %d points to upsert", len(points))
        if dry:
            logger.info("Dry run: skipping upsert")
        else:
            try:
                qc.upsert(collection_name=coll, points=points)
                logger.info("Upserted %d points", len(points))
            except Exception as e:
                logger.exception("Failed to upsert batch: %s", e)
                return

        processed += len(points)
        if limit and processed >= limit:
            break

    logger.info("Done. Processed %d points.", processed)


if __name__ == "__main__":
    main()
