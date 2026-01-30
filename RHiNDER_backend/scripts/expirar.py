import os
import sys
import pymysql
from datetime import datetime

def main():
    cnx = pymysql.connect(
        host=os.getenv("DB_HOST", "127.0.0.1"),
        user=os.getenv("DB_USER", "remoto"),
        password=os.getenv("DB_PASS", "1111"),
        database=os.getenv("DB_NAME", "rhinder_db"),
        port=int(os.getenv("DB_PORT", "3306")),
        autocommit=False,
        charset="utf8mb4",
    )

    try:
        cur = cnx.cursor()
        cur.execute("CALL sp_expirar_registros();")
        cnx.commit()
        print(f"[{datetime.now()}] OK sp_expirar_registros")
    except Exception as e:
        cnx.rollback()
        print(f"[{datetime.now()}] ERROR {e}", file=sys.stderr)
        raise
    finally:
        cnx.close()

if __name__ == "__main__":
    main()
