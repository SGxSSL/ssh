import sqlite3
import os

def backdate_pending_approvals():
    db_path = os.path.join('backend', 'approvals.db')
    
    if not os.path.exists(db_path):
        print(f"Error: Database not found at {db_path}")
        return

    # Targeting ~50 hours ago from 2026-01-29T21:24
    backdate_timestamp = '2026-01-27T10:00:00+00:00'
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Execute the update
        cursor.execute(
            "UPDATE approvals SET submitted_at = ? WHERE status = 'PENDING'",
            (backdate_timestamp,)
        )
        
        updated_count = cursor.rowcount
        conn.commit()
        
        print(f"Successfully updated {updated_count} PENDING items to {backdate_timestamp}.")
        
    except sqlite3.Error as e:
        print(f"An error occurred: {e}")
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    backdate_pending_approvals()
