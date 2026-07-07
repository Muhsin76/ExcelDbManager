import sqlite3
import os

DB_PATH = 'data.db'

def fix_database():
    if not os.path.exists(DB_PATH):
        print(f"Hata: {DB_PATH} dosyası bulunamadı!")
        return

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    table_name = 'zimmetEnvanteri'
    target_col = 'teslim_.alan'

    try:
        # Check if table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?;", (table_name,))
        if not cursor.fetchone():
            print(f"Bilgi: '{table_name}' tablosu veritabanında bulunamadı. Tablo adı farklı olabilir.")
            # List actual tables to help the user
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
            tables = [r['name'] for r in cursor.fetchall()]
            print(f"Mevcut Tablolar: {tables}")
            return

        print(f"'{table_name}' tablosu inceleniyor...")
        
        # Get column info
        cursor.execute(f"PRAGMA table_info({table_name});")
        cols = [dict(row) for row in cursor.fetchall()]
        
        # Get foreign keys
        cursor.execute(f"PRAGMA foreign_key_list({table_name});")
        fks = [dict(row) for row in cursor.fetchall()]
        
        # Check if target column is primary key
        col_to_fix = next((c for c in cols if c['name'] == target_col), None)
        if not col_to_fix:
            # Try checking without dot (in case it was sanitized differently)
            print(f"Hata: '{target_col}' sütunu '{table_name}' tablosunda bulunamadı.")
            print(f"Mevcut Sütunlar: {[c['name'] for c in cols]}")
            return
            
        print(f"Sütun '{target_col}' özellikleri: PK={col_to_fix['pk']}, Type={col_to_fix['type']}")
        
        # We will rebuild the table and force pk=0 for the target column
        col_defs = []
        for col in cols:
            c_name = col['name']
            c_type = col['type']
            
            col_def = f"{c_name} {c_type}"
            # Keep PK for other columns, but strip for our target column
            if col['name'] == target_col:
                # Strip primary key!
                pass
            else:
                if col['pk'] > 0:
                    col_def += " PRIMARY KEY"
                    
            if col['notnull']:
                col_def += " NOT NULL"
            if col['dflt_value'] is not None:
                col_def += f" DEFAULT {col['dflt_value']}"
            col_defs.append(col_def)

        # Reconstruct foreign keys
        fk_clauses = []
        for fk in fks:
            fk_clauses.append(f"FOREIGN KEY ({fk['from']}) REFERENCES {fk['table']} ({fk['to']}) ON UPDATE {fk['on_update']} ON DELETE {fk['on_delete']}")
            
        table_body = col_defs + fk_clauses
        new_schema_sql = f"CREATE TABLE {table_name}_new ({', '.join(table_body)});"
        
        # Execute transaction
        conn.execute("PRAGMA foreign_keys = OFF;")
        cursor.execute("BEGIN TRANSACTION;")
        
        cursor.execute(new_schema_sql)
        
        columns_str = ", ".join(col['name'] for col in cols)
        cursor.execute(f"INSERT INTO {table_name}_new ({columns_str}) SELECT {columns_str} FROM {table_name};")
        
        cursor.execute(f"DROP TABLE {table_name};")
        cursor.execute(f"ALTER TABLE {table_name}_new RENAME TO {table_name};")
        
        cursor.execute("COMMIT;")
        print(f"Başarılı! Sütun '{target_col}' üzerindeki PRIMARY KEY/UNIQUE kısıtlaması kaldırıldı.")
        print("Şimdi arayüzden ilişkiyi tekrar kurmayı deneyebilirsiniz.")
        
    except Exception as e:
        conn.rollback()
        print(f"Hata oluştu: {str(e)}")
    finally:
        conn.execute("PRAGMA foreign_keys = ON;")
        conn.close()

if __name__ == "__main__":
    fix_database()
