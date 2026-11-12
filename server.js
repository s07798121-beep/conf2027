import express from "express";
import session from "express-session";
import bcrypt from "bcryptjs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

import { User, Room, Requests } from "./db.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3000;

// ==================== МИДЛВАРЫ ====================

app.use(express.urlencoded({ extended: true }));
app.use(express.static(join(__dirname, "public")));

app.set("view engine", "ejs");
app.set("views", join(__dirname, "views"));

app.use(
  session({
    secret: "conf2027-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 2,
      httpOnly: true,
      sameSite: "lax",
    },
  }),
);

app.use((req, res, next) => {
  res.locals.session = req.session;
  next();
});

const INACTIVITY_LIMIT = 20 * 60 * 1000;

app.use((req, res, next) => {
  if (req.session && req.session.userId) {
    const now = Date.now();

    if (
      req.session.lastActivity &&
      now - req.session.lastActivity > INACTIVITY_LIMIT
    ) {
      return req.session.destroy(() => res.redirect("/login"));
    }

    req.session.lastActivity = now;
  }
  next();
});

// ==================== ДОСТУП ====================

const requireAuth = (req, res, next) =>
  req.session.userId ? next() : res.redirect("/login");

const requireAdmin = (req, res, next) =>
  req.session.login === "Conf2027" ? next() : res.redirect("/login");

// ==================== ВАЛИДАЦИЯ ====================

const RULES = [
  {
    field: "login",
    test: (v) => /^[A-Za-z0-9]{6,}$/.test(v),
    msg: "Логин: латиница+цифры, минимум 6 символов",
  },
  {
    field: "password",
    test: (v) => v && v.length >= 8,
    msg: "Пароль: минимум 8 символов",
  },
  {
    field: "fio",
    test: (v) => /^[А-Яа-яЁё\s]+$/.test(v),
    msg: "ФИО: только кириллица и пробелы",
  },
  {
    field: "phone",
    test: (v) => /^8\(\d{3}\)\d{3}-\d{2}-\d{2}$/.test(v),
    msg: "Телефон: формат 8(ХХХ)ХХХ-ХХ-ХХ",
  },
  {
    field: "email",
    test: (v) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v),
    msg: "Email: некорректный формат",
  },
];

const validate = (data) =>
  RULES.filter(({ field, test }) => !test((data[field] || "").trim())).map(
    (r) => r.msg,
  );

// ==================== МАРШРУТЫ ====================

// Главная — редирект (оставлено, не оценивается)
app.get("/", (req, res) => res.redirect("/login"));

// ---------- Регистрация ----------

app.get("/register", (req, res) => {
  res.render("auth", {
    mode: "register",
    form: {},
    errors: [],
    flash: null,
  });
});

app.post("/register", (req, res) => {
  // TODO: 1. Валидировать req.body через validate
  const errors = validate(req.body);
  // TODO: 2. Проверить уникальность логина через User.exists
  if (User.exists(req.body.login)) {
    errors.push("логин заня");
  }
  // TODO: 3. Если ошибки — res.render("auth", { mode: "register", form: req.body, errors })
  if (errors.length) {
    return res.render("auth", {
      mode: "register",
      form: req.body,
      errors,
    });
  }
  // TODO: 4. Создать пользователя через User.create
  User.create(req.body);
  // TODO: 5. Установить flash и редирект на /login
  req.session.flash = {
    type: "success",
    text: "успех",
  };

  res.redirect("/login");

  res.send("Регистрация пока не реализована");
});

// ---------- Вход ----------

app.get("/login", (req, res) => {
  const flash = req.session.flash || null;
  delete req.session.flash;

  res.render("auth", {
    mode: "login",
    error: null,
    flash,
  });
});

app.post("/login", (req, res) => {
  // TODO: 1. Найти пользователя через User.findByLogin
  const user = User.findByLogin(req.body.login);
  // TODO: 2. Проверить пароль через bcrypt.compareSync
  if (user && bcrypt.compareSync(req.body.password, user.password)) {
    // TODO: 3. Установить session (userId, fio, login, lastActivity)
    req.session.userId = user.id;
    req.session.fio = user.fio;
    req.session.login = user.login;
    req.session.lastActivity = Date.now();
    console.log(user);
    // TODO: 4. Редирект на /admin (если Conf2027) или /dashboard
    return res.redirect(user.login === "Conf2027" ? "/admin" : "/dashboard");
  }
  // TODO: 5. Если ошибка — res.render("auth", { mode: "login", error: "..." })
  res.render("auth", {
    mode: "login",
    error: "ни потужно",
    flash: null,
  });
  res.send("Вход пока не реализован");
});

// ---------- Выход ----------

app.all("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/login"));
});

// ---------- Заявки пользователя ----------

app.get("/dashboard", requireAuth, (req, res) => {
  // TODO: получить заявки через Requests.findByUser(req.session.userId)
  const requests = Requests.findByUser(req.session.userId);

  res.render("requests_list", { isAdmin: false, requests });
});

// ---------- Создание заявки ----------

app
  .route("/create")
  .get(requireAuth, (req, res) => {
    // TODO: получить комнаты через Room.findAll()
    const rooms = Room.findAll;
    res.render("create_request", { rooms, errors: [] });
  })
  .post(requireAuth, (req, res) => {
    // TODO: 1. Проверить, что room_id, date_start, payment заполнены
    Tuble.create({
      userId: req.session.userId,
      roomId: req.body.room_id,
      dateStart: req.body.date_start,
      payment: req.body.payment,
    });
    res.redirect("/dashboard");
    // TODO: 2. Если нет — res.render("create_request", { rooms, errors: [...] })

    // TODO: 3. Создать заявку через Requests.create
    // TODO: 4. Редирект на /dashboard
    res.send("Создание заявки пока не реализовано");
  });

// ---------- Админ-панель ----------

app.get("/admin", requireAdmin, (req, res) => {
  // TODO: получить все заявки через Requests.findAllDetailed()
  const requests = Requests.findAllDetailed();
  res.render("requests_list", { isAdmin: true, requests });
});

app.post("/admin", requireAdmin, (req, res) => {
  // TODO: Requests.updateStatus(req.body.id, req.body.status)
  Requests.updateStatus(req.body.id, req.bodu.status);
  // TODO: редирект на /admin
  res.redirect("/admin");
  res.send("Смена статуса пока не реализована");
});

// ---------- Помещения ----------

app.get("/rooms", (req, res) => {
  // TODO: получить комнаты через Room.findAll()
  const rooms = Room.findAll();
  res.render("rooms", { rooms });
});

app.get("/rooms/type/:type", (req, res) => {
  // TODO: получить комнаты через Room.findAll().filter(...)
  const rooms = Room.findByType(req.params.type);
  res.render("rooms", { rooms });
});

// ---------- Просмотр заявки ----------

app.get("/request/:id", requireAuth, (req, res) => {
  // TODO: 1. Получить заявку через Requests.findDetailed(req.params.id)
  // TODO: 2. Если нет — 404
  // TODO: 3. Проверить доступ (isOwner / isAdmin), иначе 403
  // TODO: 4. res.render("request_detail", { request, isOwner, isAdmin })
  res.send("Просмотр заявки пока не реализован");
});

// ---------- Отзыв ----------

app.post("/review/:id", requireAuth, (req, res) => {
  // TODO: 1. Получить заявку через Requests.findDetailed
  Requests.addReview(req.params.id, req.session.userId, req.body.review);
  // TODO: 2. Если нет — 404
  // TODO: 3. Проверить, что текущий пользователь — владелец
  // TODO: 4. Requests.addReview(request.id, req.session.userId, review)
  // TODO: 5. Редирект на /request/:id
  res.redirect("/dashboard");
  res.send("Отзыв пока не реализован");
});

app.listen(PORT, () => {
  console.log(`Сервер: http://localhost:${PORT}`);
});
