import sqlite3

def add_manager_column():
    conn = sqlite3.connect("database.db")
    c = conn.cursor()

    try:
        c.execute("ALTER TABLE requests ADD COLUMN manager_status TEXT DEFAULT 'Pending'")
        print("✅ manager_status column added")
    except:
        print("⚠️ Column already exists")

    conn.commit()
    conn.close()

add_manager_column()