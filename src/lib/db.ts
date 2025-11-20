// IndexedDB wrapper for offline attendance storage

const DB_NAME = "RuralAttendanceDB";
const DB_VERSION = 1;
const STORES = {
  ATTENDANCE: "attendance",
  STUDENTS: "students",
  SYNC_QUEUE: "syncQueue"
};

export interface AttendanceRecord {
  id?: number;
  studentId: string;
  studentName: string;
  rollNo: string;
  class: string;
  status: "present" | "absent";
  timestamp: number;
  date: string;
  synced: boolean;
}

export interface Student {
  id: string;
  name: string;
  rollNo: string;
  class: string;
}

class AttendanceDB {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Attendance records store
        if (!db.objectStoreNames.contains(STORES.ATTENDANCE)) {
          const attendanceStore = db.createObjectStore(STORES.ATTENDANCE, { 
            keyPath: "id", 
            autoIncrement: true 
          });
          attendanceStore.createIndex("date", "date", { unique: false });
          attendanceStore.createIndex("studentId", "studentId", { unique: false });
          attendanceStore.createIndex("synced", "synced", { unique: false });
        }

        // Students store
        if (!db.objectStoreNames.contains(STORES.STUDENTS)) {
          db.createObjectStore(STORES.STUDENTS, { keyPath: "id" });
        }

        // Sync queue for pending uploads
        if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
          const syncStore = db.createObjectStore(STORES.SYNC_QUEUE, { 
            keyPath: "id", 
            autoIncrement: true 
          });
          syncStore.createIndex("timestamp", "timestamp", { unique: false });
        }
      };
    });
  }

  // Add attendance record
  async addAttendance(record: Omit<AttendanceRecord, "id">): Promise<number> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.ATTENDANCE], "readwrite");
      const store = transaction.objectStore(STORES.ATTENDANCE);
      const request = store.add(record);

      request.onsuccess = () => resolve(request.result as number);
      request.onerror = () => reject(request.error);
    });
  }

  // Get all attendance records for a specific date
  async getAttendanceByDate(date: string): Promise<AttendanceRecord[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.ATTENDANCE], "readonly");
      const store = transaction.objectStore(STORES.ATTENDANCE);
      const index = store.index("date");
      const request = index.getAll(date);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Get unsynced records
  async getUnsyncedRecords(): Promise<AttendanceRecord[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.ATTENDANCE], "readonly");
      const store = transaction.objectStore(STORES.ATTENDANCE);
      const request = store.getAll();

      request.onsuccess = () => {
        const allRecords = request.result;
        const unsyncedRecords = allRecords.filter(record => !record.synced);
        resolve(unsyncedRecords);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Mark records as synced
  async markAsSynced(ids: number[]): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.ATTENDANCE], "readwrite");
      const store = transaction.objectStore(STORES.ATTENDANCE);

      let completed = 0;
      ids.forEach(id => {
        const getRequest = store.get(id);
        getRequest.onsuccess = () => {
          const record = getRequest.result;
          if (record) {
            record.synced = true;
            store.put(record);
          }
          completed++;
          if (completed === ids.length) resolve();
        };
      });

      transaction.onerror = () => reject(transaction.error);
    });
  }

  // Save students to local database
  async saveStudents(students: Student[]): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.STUDENTS], "readwrite");
      const store = transaction.objectStore(STORES.STUDENTS);

      students.forEach(student => store.put(student));

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  // Get all students
  async getStudents(): Promise<Student[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.STUDENTS], "readonly");
      const store = transaction.objectStore(STORES.STUDENTS);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Get today's attendance stats
  async getTodayStats(date: string): Promise<{
    total: number;
    present: number;
    absent: number;
    notMarked: number;
  }> {
    const [students, attendance] = await Promise.all([
      this.getStudents(),
      this.getAttendanceByDate(date)
    ]);

    const total = students.length;
    const present = attendance.filter(a => a.status === "present").length;
    const absent = attendance.filter(a => a.status === "absent").length;
    const notMarked = total - present - absent;

    return { total, present, absent, notMarked };
  }
}

export const db = new AttendanceDB();
