import sqlite3
import os

DB_PATH = 'data.db'

def analyze():
    if not os.path.exists(DB_PATH):
        print(f"Hata: {DB_PATH} dosyası bulunamadı!")
        print("Lütfen bu betiği 'data.db' dosyasının bulunduğu dizinde çalıştırın.")
        return

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    try:
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = [row['name'] for row in cursor.fetchall()]

        print("=" * 70)
        print(" VERİTABANI SÜTUN ANALİZ RAPORU ")
        print("=" * 70)

        for table in tables:
            # Skip system or temp tables
            if table.startswith('sqlite_') or table.endswith('_new'):
                continue

            print(f"\nTablo: {table}")
            print("-" * 40)
            
            cursor.execute(f"PRAGMA table_info({table});")
            columns_info = [dict(row) for row in cursor.fetchall()]
            
            for col_info in columns_info:
                col = col_info['name']
                col_type = col_info['type']
                
                # Check for total rows
                cursor.execute(f"SELECT COUNT(*) as total FROM {table};")
                total = cursor.fetchone()['total']
                
                # Check for non-null count
                cursor.execute(f"SELECT COUNT(*) as non_null FROM {table} WHERE {col} IS NOT NULL AND {col} != '';")
                non_null = cursor.fetchone()['non_null']
                
                # Check for unique count
                cursor.execute(f"SELECT COUNT(DISTINCT {col}) as unique_cnt FROM {table} WHERE {col} IS NOT NULL AND {col} != '';")
                unique_cnt = cursor.fetchone()['unique_cnt']
                
                is_unique = (unique_cnt == non_null) and (total > 0)
                
                status = "BENZERSİZ (İlişki kurmaya uygun)" if is_unique else "YİNELENEN VERİ VAR (İlişki için uygun değil)"
                
                print(f"  • Sütun: {col} ({col_type})")
                print(f"    - Durum: {status}")
                print(f"    - Toplam Satır: {total} (Boş Olmayan Satır: {non_null})")
                print(f"    - Benzersiz Değer Sayısı: {unique_cnt}")
                
                if not is_unique and non_null > 0:
                    cursor.execute(f"""
                        SELECT {col}, COUNT(*) as cnt 
                        FROM {table} 
                        WHERE {col} IS NOT NULL AND {col} != ''
                        GROUP BY {col} 
                        HAVING cnt > 1 
                        ORDER BY cnt DESC 
                        LIMIT 3;
                    """)
                    duplicates = cursor.fetchall()
                    if duplicates:
                        dup_str = ", ".join([f"'{row[0]}' ({row[1]} kez)" for row in duplicates])
                        print(f"    - Tekrar Eden Bazı Değerler: {dup_str}")
                        
            print("-" * 40)
            
    except Exception as e:
        print(f"Hata oluştu: {str(e)}")
    finally:
        conn.close()

if __name__ == "__main__":
    analyze()
