#!/usr/bin/env python3
"""
Удаление старых объектов в Firebase/GCS Storage (например, залитые для анализа ролики).

Бакет по умолчанию: playerone-e6ff2.firebasestorage.app
Префикс по умолчанию: videos/

Требования:
  pip install google-cloud-storage
  gcloud auth application-default login
  # или export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json

Примеры:
  # только список к удалению (ничего не удаляет)
  python3 scripts/cleanup_playerone_storage_videos.py --older-than-days 7

  # реально удалить
  python3 scripts/cleanup_playerone_storage_videos.py --older-than-days 7 --execute
"""

from __future__ import annotations

import argparse
import sys
from datetime import datetime, timedelta, timezone


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--bucket",
        default="playerone-e6ff2.firebasestorage.app",
        help="Имя GCS-бакета",
    )
    parser.add_argument(
        "--prefix",
        default="videos/",
        help="Префикс объектов (папка в Storage)",
    )
    parser.add_argument(
        "--older-than-days",
        type=int,
        default=14,
        help="Удалять объекты старше N дней (по time_created в GCS)",
    )
    parser.add_argument(
        "--execute",
        action="store_true",
        help="Без этого флага только dry-run (список и суммарный размер)",
    )
    args = parser.parse_args()

    try:
        from google.cloud import storage
    except ImportError:
        print(
            "Установите: pip install google-cloud-storage",
            file=sys.stderr,
        )
        return 1

    client = storage.Client()
    bucket = client.bucket(args.bucket)
    cutoff = datetime.now(timezone.utc) - timedelta(days=args.older_than_days)

    to_delete: list = []
    total_bytes = 0
    for blob in client.list_blobs(bucket, prefix=args.prefix):
        created = blob.time_created
        if created is None:
            continue
        if created.tzinfo is None:
            created = created.replace(tzinfo=timezone.utc)
        if created < cutoff:
            to_delete.append(blob)
            total_bytes += blob.size or 0

    print(
        f"Бакет: {args.bucket}\n"
        f"Префикс: {args.prefix}\n"
        f"Порог: старше {args.older_than_days} дней (до {cutoff.isoformat()})\n"
        f"Найдено объектов: {len(to_delete)}\n"
        f"Суммарный размер: {total_bytes / (1024 ** 3):.3f} GiB\n"
    )

    if not to_delete:
        return 0

    for b in to_delete[:50]:
        print(f"  {b.name}  ({b.size or 0} B, created {b.time_created})")
    if len(to_delete) > 50:
        print(f"  ... и ещё {len(to_delete) - 50} объектов")

    if not args.execute:
        print(
            "\nDry-run: объекты не удалены. "
            "Запустите с --execute для удаления."
        )
        return 0

    print("\nУдаление...")
    errors = 0
    for blob in to_delete:
        try:
            blob.delete()
        except Exception as e:
            print(f"Ошибка {blob.name}: {e}", file=sys.stderr)
            errors += 1
    print(f"Готово. Удалено: {len(to_delete) - errors}, ошибок: {errors}")
    return 0 if errors == 0 else 2


if __name__ == "__main__":
    raise SystemExit(main())
