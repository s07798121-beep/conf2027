import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const db = new Database(join(__dirname, "conf.db"));

db.pragma("foreign_keys = ON");

// ==================== ТАБЛИЦЫ ====================

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    login TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    fio TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    capacity INTEGER NOT NULL
  );
`);
db.exec(`
  CREATE TABLE IF NOT EXISTS requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    room_id INTEGER NOT NULL,
    date_start TEXT NOT NULL,
    payment TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Новая',
    review TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE RESTRICT
  );
`);

// ==================== SEED ====================

const usersCount = db.prepare("SELECT COUNT(*) AS c FROM users").get().c;
const roomsCount = db.prepare("SELECT COUNT(*) AS c FROM rooms").get().c;
const requestsCount = db.prepare("SELECT COUNT(*) AS c FROM requests").get().c;

if (usersCount === 0) {
  const stmt = db.prepare(`
    INSERT INTO users (login, password, fio, phone, email)
    VALUES (?, ?, ?, ?, ?)
  `);
  // TODO: хэшировать пароли через bcrypt.hashSync перед вставкой
  stmt.run(
    "ivan",
    hash("demo"),
    "Иванов Иван",
    "8(999)123-45-67",
    "ivan@example.com",
  );
  stmt.run(
    "petr",
    hash("demo"),
    "Петров Пётр",
    "8(999)123-45-68",
    "petr@example.com",
  );
  stmt.run(
    "anna",
    hash("demo"),
    "Анна Сидорова",
    "8(999)123-45-69",
    "anna@example.com",
  );
  stmt.run(
    "Conf2027",
    "Demo77",
    "Администратор",
    "8(999)000-00-00",
    "admin@conf.ru",
  );
  console.log("Тестовые пользователи добавлены");
}

if (roomsCount === 0) {
  const stmt = db.prepare(`
    INSERT INTO rooms (name, type, capacity)
    VALUES (?, ?, ?)
  `);
  stmt.run("Аудитория №1", "Аудитория", 100);
  stmt.run("Аудитория №2", "Аудитория", 50);
  stmt.run("Коворкинг «Точка»", "Коворкинг", 20);
  stmt.run("Кинозал «Октябрь»", "Кинозал", 80);
  console.log("Тестовые комнаты добавлены");
}

if (requestsCount === 0) {
  const stmt = db.prepare(`
    INSERT INTO requests (user_id, room_id, date_start, payment)
    VALUES (?, ?, ?, ?)
  `);
  stmt.run(1, 1, "2027-03-15", "При очном посещении");
  stmt.run(1, 3, "2027-03-20", "Перевод по СБП");
  stmt.run(2, 4, "2027-04-01", "При очном посещении");
  console.log("Тестовые заявки добавлены");
}

// ==================== КЛАССЫ ====================

class UserModel {
  constructor() {
    this.table = "users";
  }

  findById(id) {
    // TODO: SELECT * FROM users WHERE id = ?
    return db.prepare(`SELECT * FROM ${this.table} WHERE id = ?`).get(id);
  }

  findByLogin(login) {
    // TODO: SELECT * FROM users WHERE login = ?
    return db.prepare(`SELECT * FROM ${this.table} WHERE login = ?`).get(login);
  }

  findAll() {
    // TODO: SELECT * FROM users
    return db.prepare(`SELECT * FROM ${this.table}`).all();
  }

  count() {
    // TODO: SELECT COUNT(*) AS c FROM users
    return db.prepare(`SELECT COUNT(*) as count FROM ${this.table}`).get();
  }

  exists(login) {
    // TODO: вернуть true, если пользователь с таким login есть
    const row = db
      .prepare(`SELECT 1 FROM ${this.table} WHERE login = ?`)
      .get(login);
    return !!row;
  }

  create({ login, password, fio, phone, email }) {
    // TODO: 1. Хэшировать password через bcrypt.hashSync
    const hashed = bcrypt.hashSync(password, 10);
    // TODO: 2. INSERT INTO users (login, password, fio, phone, email)
    const r = db
      .prepare(
        `
      INSERT INTO ${this.table} (login, password, fio, phone, email)
      VALUES (?, ?, ?, ?, ?)
      `,
      )
      .run(login, password, fio, phone, email);
    // TODO: 3. Вернуть созданного пользователя через this.findById
    return this.findById(r.lastInsertRowid);
  }
}

class RoomModel {
  constructor() {
    this.table = "rooms";
  }

  findAll() {
    // TODO: SELECT * FROM rooms
    return db.prepare(`SELECT * FROM ${this.table}`).all();
  }

  findById(id) {
    // TODO: SELECT * FROM rooms WHERE id = ?
    return db.prepare(`SELECT * FROM ${this.table} WHERE id`).get(id);
  }

  findByType(type) {
    // TODO: SELECT * FROM rooms WHERE type = ?
    return db.prepare(`SELECT * FROM ${this.table} WHERE type`).get(type);
  }

  count() {
    // TODO: SELECT COUNT(*) AS c FROM rooms
    return db.prepare(`SELECT COUNT(*) as count FROM ${this.table}`).get();
  }
}

class RequestsModel {
  constructor() {
    this.table = "requests";
  }

  findById(id) {
    // TODO: SELECT * FROM requests WHERE id = ?
    return db.prepare(`SELECT * FROM ${this.table} WHERE id`).get(id);
  }

  count() {
    // TODO: SELECT COUNT(*) AS c FROM requests
    return db.prepare(`SELECT COUNT(*) as count FROM ${this.table}`).get();
  }

  findByUser(userId) {
    // TODO: JOIN с rooms, чтобы получить room_name и room_type
    // TODO: WHERE r.user_id = ?
    return db
      .prepare(
        `SELECT r.*, rooms.name AS room_name
      FROM requests AS r
      JOIN rooms ON room.id = room_id
      WHERE r.user.id = ?
      `,
      )
      .all(userId);
  }

  findAllDetailed() {
    // TODO: JOIN с users (user_fio, user_login) и rooms (room_name, room_type)
    return db
      .prepare(
        `SELECT r.*, users.login AS user_login,
      users.fio AS user_fio,
      rooms.name AS room_name
      FROM requests AS r
      JOIN users ON users.id = r.user_id
      JOIN rooms ON rooms.id = r.room_id
      `,
      )
      .all();
  }

  updateStatus(id, status) {
    // TODO: UPDATE requests SET status = ? WHERE id = ?
    return db
      .prepare(`UPDATE ${this.table} SET status = ? WHERE id = ?`)
      .run(id, status);
  }

  findDetailed(id) {
    // TODO: JOIN с users и rooms, вернуть одну заявку
    return db
      .prepare(
        `
      SELECT r.*
      u.fio AS user.fio,
      u.login AS user.login,
      u.email AS user.email,
      u.phone AS user.phone,
      rm.name AS room.name,
      rm.type AS room.type,
      rm.capacity AS room.capacity
      FROM ${this.table} r
      JOIN users u ON u.id = r.user_id
      join rooms rm ON rm.id = room_id
      WHERE r.id = ?`,
      )
      .get(id);
  }

  addReview(id, userId, review) {
    // TODO: UPDATE requests SET review = ?
    if (!review || !review.trim()) return false;
    const r = db
      .prepare(
        `UPDATE ${this.table} SET review = ? WHERE id = ? AND user_id = ? AND status = 'zaversheno'`,
      )
      .run(review.trim(), id, userId);
    // TODO: WHERE id = ? AND user_id = ? AND status = 'Завершено'
    return r.changes > 0;
  }

  // TODO: INSERT INTO requests (user_id, room_id, date_start, payment)
  // TODO: Вернуть созданную заявку через this.findById
  create({ userId, roomId, dateStart, payment }) {
    const r = db
      .prepare(
        `INSERT INTO ${this.table} (userId, roomId, dateStart, payment)
      VALUES (?, ?, ?, ?)`,
      )
      .run(userId, roomId, dateStart, payment);
    return this.findById(r.lastInsertRowid);
  }
}

export const User = new UserModel();
export const Room = new RoomModel();
export const Requests = new RequestsModel();

export default db;
