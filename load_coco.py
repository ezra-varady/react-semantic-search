import psycopg2
import os
import time
from concurrent.futures import ProcessPoolExecutor

def get_files(directory_path):
    filenames = os.listdir(directory_path)
    filenames = [f for f in filenames if os.path.isfile(os.path.join(directory_path, f))]
    return filenames

def insert_into_db(directory_path, im):
    conn = psycopg2.connect(
        host="localhost",
        database="",
        user="",
        password="",
        port=5432
    )
    cur = conn.cursor()
    path = f'{directory_path}/{im}'
    insert_query = f'INSERT INTO image_table (v, location) VALUES (clip_image(\'{path}\'), \'{path}\');'
    cur.execute(insert_query)
    conn.commit()
    conn.close()

def chunk(l, n):
    for i in range(0, len(l), n):
        yield l[i:i + n]

if __name__=='__main__':
    directory_path = f'{os.getcwd()}/unlabeled2017'
    files = get_files(directory_path)

    conn = psycopg2.connect(
        host="localhost",
        database="",
        user="",
        password="",
        port=5432
    )
    cur = conn.cursor()
    cur.execute('''
        CREATE TABLE IF NOT EXISTS image_table (
            v REAL[],
            location VARCHAR,
            id SERIAL PRIMARY KEY
        );''')

    conn.commit()
    cur.execute('''
        CREATE INDEX semantic_image ON image_table 
            USING hnsw (v dist_cos_ops) 
            WITH (M=5, ef=30, ef_construction=30, dims=512
            );''')
    conn.commit()
    conn.close()

    abs_start = time.time()
    for i, sub in enumerate(chunk(files, 1000)):
        start = time.time()
        
        def process(im):
            insert_into_db(directory_path, im)
        with ProcessPoolExecutor(max_workers=16) as executor:
            executor.map(process, sub)
        
        end = time.time()
        print(f'completed {1000*i}-{1000*(i+1)} in {end-start} second, {end-abs_start} elapsed so far')

