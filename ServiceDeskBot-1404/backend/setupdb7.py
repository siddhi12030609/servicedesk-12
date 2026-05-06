import sqlite3

conn = sqlite3.connect("database.db")
cursor = conn.cursor()

cursor.execute("UPDATE requests SET manager='rohit1' WHERE manager='rohit'")

conn.commit()
conn.close()

print("✅ Manager updated successfully")