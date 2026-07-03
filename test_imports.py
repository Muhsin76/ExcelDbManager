import urllib.request
import json
import os
import mimetypes

def test_parse_and_import(file_path, file_name, mime_type, import_mode='new', sheet_name=None):
    url = 'http://127.0.0.1:5000/api/parse-file'
    
    # Standard multipart file upload construction in pure Python
    boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW'
    data = []
    data.append(f'--{boundary}'.encode('utf-8'))
    data.append(f'Content-Disposition: form-data; name="file"; filename="{file_name}"'.encode('utf-8'))
    data.append(f'Content-Type: {mime_type}'.encode('utf-8'))
    data.append(b'')
    with open(file_path, 'rb') as f:
        data.append(f.read())
    data.append(f'--{boundary}--'.encode('utf-8'))
    data.append(b'')
    
    body = b'\r\n'.join(data)
    
    req = urllib.request.Request(url, data=body)
    req.add_header('Content-Type', f'multipart/form-data; boundary={boundary}')
    
    try:
        with urllib.request.urlopen(req) as res:
            response_data = json.loads(res.read().decode('utf-8'))
            if not response_data.get('success'):
                print(f"FAIL parse: {response_data.get('error')}")
                return False
            
            print(f"SUCCESS parse '{file_name}': {len(response_data.get('columns'))} columns, {len(response_data.get('preview_rows'))} preview rows.")
            
            # Now, execute import
            file_key = response_data['file_key']
            file_ext = response_data['file_ext']
            suggested_name = response_data['suggested_table_name']
            columns_def = response_data['columns']
            
            import_url = 'http://127.0.0.1:5000/api/import-file'
            import_payload = {
                'file_key': file_key,
                'file_ext': file_ext,
                'sheet_name': sheet_name or (response_data['sheets'][0] if response_data['sheets'] else None),
                'table_name': suggested_name,
                'import_mode': import_mode,
                'columns': columns_def
            }
            
            req_import = urllib.request.Request(
                import_url,
                data=json.dumps(import_payload).encode('utf-8'),
                headers={'Content-Type': 'application/json'}
            )
            
            with urllib.request.urlopen(req_import) as res_import:
                import_response = json.loads(res_import.read().decode('utf-8'))
                if not import_response.get('success'):
                    print(f"FAIL import: {import_response.get('error')}")
                    return False
                print(f"SUCCESS import: {import_response.get('message')}")
                return True
                
    except Exception as e:
        print(f"Request failed: {str(e)}")
        return False

if __name__ == '__main__':
    print("Testing CSV upload...")
    test_parse_and_import('sample_customers.csv', 'sample_customers.csv', 'text/csv')
    
    print("\nTesting Excel upload...")
    test_parse_and_import('sample_employees.xlsx', 'sample_employees.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
