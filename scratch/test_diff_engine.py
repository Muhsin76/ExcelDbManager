import os
import openpyxl
from app import app, get_db_connection

def test_diff():
    # 1. Create 2 sample excel files
    wb1 = openpyxl.Workbook()
    ws1 = wb1.active
    ws1.title = "Stok_V1"
    ws1.append(["urun_kodu", "urun_adi", "fiyat", "stok"])
    ws1.append(["PRD01", "Laptop", "15000", "10"])
    ws1.append(["PRD02", "Mouse", "250", "50"])
    ws1.append(["PRD03", "Klavye", "500", "30"])
    wb1.save("temp_v1.xlsx")

    wb2 = openpyxl.Workbook()
    ws2 = wb2.active
    ws2.title = "Stok_V2"
    ws2.append(["urun_kodu", "urun_adi", "fiyat", "stok"])
    ws2.append(["PRD01", "Laptop", "16500", "8"]) # Modified (Fiyat & Stok changed)
    ws2.append(["PRD02", "Mouse", "250", "50"]) # Unchanged
    # PRD03 deleted
    ws2.append(["PRD04", "Monitör", "3000", "15"]) # Added
    wb2.save("temp_v2.xlsx")

    client = app.test_client()

    with open("temp_v1.xlsx", "rb") as f1, open("temp_v2.xlsx", "rb") as f2:
        response = client.post('/api/diff/compare', data={
            'compare_type': 'files',
            'key_column': 'urun_kodu',
            'file_a': (f1, 'temp_v1.xlsx'),
            'file_b': (f2, 'temp_v2.xlsx')
        }, content_type='multipart/form-data')

    res = response.get_json()
    print("Diff Compare Result:", res)

    assert res['success'] == True
    assert res['summary']['added_count'] == 1
    assert res['summary']['deleted_count'] == 1
    assert res['summary']['modified_count'] == 1
    assert res['summary']['unchanged_count'] == 1

    # Cleanup temp files
    os.remove("temp_v1.xlsx")
    os.remove("temp_v2.xlsx")
    print("ALL TESTS PASSED SUCCESSFULLY!")

if __name__ == '__main__':
    test_diff()
