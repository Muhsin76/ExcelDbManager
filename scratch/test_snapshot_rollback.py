import sqlite3
from app import app, get_db_connection

def test_snapshot_and_rollback():
    # Create test table
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DROP TABLE IF EXISTS test_products;")
    cursor.execute("CREATE TABLE test_products (urun_kodu TEXT PRIMARY KEY, urun_adi TEXT, fiyat TEXT);")
    cursor.execute("INSERT INTO test_products VALUES ('P1', 'Laptop', '10000');")
    cursor.execute("INSERT INTO test_products VALUES ('P2', 'Mouse', '200');")
    conn.commit()
    conn.close()

    client = app.test_client()

    # 1. Check snapshot status (should be false)
    resp = client.get('/api/tables/test_products/snapshot/status')
    res = resp.get_json()
    assert res['success'] == True
    assert res['has_backup'] == False

    # 2. Create snapshot
    resp = client.post('/api/tables/test_products/snapshot')
    res = resp.get_json()
    assert res['success'] == True

    # 3. Check status again (should be true with 2 rows)
    resp = client.get('/api/tables/test_products/snapshot/status')
    res = resp.get_json()
    assert res['has_backup'] == True
    assert res['backup_row_count'] == 2

    # 4. Modify test_products table
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE test_products SET fiyat = '15000' WHERE urun_kodu = 'P1';")
    cursor.execute("INSERT INTO test_products VALUES ('P3', 'Klavye', '500');")
    conn.commit()
    conn.close()

    # Verify modified state (3 rows, P1 price 15000)
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) as count FROM test_products;")
    assert cursor.fetchone()['count'] == 3
    conn.close()

    # 5. Perform Rollback
    resp = client.post('/api/tables/test_products/rollback')
    res = resp.get_json()
    assert res['success'] == True

    # 6. Verify restored state (back to 2 rows, P1 price 10000)
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) as count FROM test_products;")
    assert cursor.fetchone()['count'] == 2
    cursor.execute("SELECT fiyat FROM test_products WHERE urun_kodu = 'P1';")
    assert cursor.fetchone()['fiyat'] == '10000'
    conn.close()

    print("SNAPSHOT & ROLLBACK INTEGRATION TESTS PASSED SUCCESSFULLY!")

if __name__ == '__main__':
    test_snapshot_and_rollback()
