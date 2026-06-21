import { FormEvent, useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { useAppData } from "../store/AppData";
import Breadcrumbs from "../components/Breadcrumbs";
import { Icon, IconName } from "../components/Icon";
import { UserAvatar } from "../components/UserAvatar";
import { ROLE_CHIP, ROLE_LABEL } from "../utils/roles";
import type { User } from "../types";
import { Link } from "react-router-dom";

export default function ProfilePage() {
  const { user, refresh } = useAuth();
  const { projects } = useAppData();

  const [fullName, setFullName] = useState("");
  const [department, setDepartment] = useState("");
  const [position, setPosition] = useState("");
  const [phone, setPhone] = useState("");
  const [about, setAbout] = useState("");
  const [profileStatus, setProfileStatus] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pwStatus, setPwStatus] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [savingPw, setSavingPw] = useState(false);

  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    setFullName(user.full_name);
    setDepartment(user.department || "");
    setPosition(user.position || "");
    setPhone(user.phone || "");
    setAbout(user.about || "");
  }, [user]);

  if (!user) return null;

  const myProjects = projects;

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setProfileStatus(null);
    try {
      await api.put<User>("/api/profile", {
        full_name: fullName,
        department: department || null,
        position: position || null,
        phone: phone || null,
        about,
      });
      await refresh();
      setProfileStatus({ kind: "ok", text: "Данные профиля обновлены" });
    } catch (err) {
      setProfileStatus({ kind: "error", text: err instanceof Error ? err.message : "Не удалось сохранить" });
    } finally {
      setSavingProfile(false);
    }
  }

  async function changePassword(e: FormEvent) {
    e.preventDefault();
    setPwStatus(null);
    if (next !== confirm) {
      setPwStatus({ kind: "error", text: "Новый пароль не совпадает с подтверждением" });
      return;
    }
    if (next.length < 4) {
      setPwStatus({ kind: "error", text: "Минимальная длина пароля — 4 символа" });
      return;
    }
    setSavingPw(true);
    try {
      await api.post("/api/auth/password", { current_password: current, new_password: next });
      setPwStatus({ kind: "ok", text: "Пароль успешно изменён" });
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (err) {
      setPwStatus({ kind: "error", text: err instanceof Error ? err.message : "Не удалось сменить пароль" });
    } finally {
      setSavingPw(false);
    }
  }

  async function uploadAvatar(file: File) {
    setAvatarBusy(true);
    setAvatarError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/profile/avatar", {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("knowbase.token") || ""}` },
        body: form,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body && typeof body.detail === "string" && body.detail) || "Не удалось загрузить изображение");
      }
      await refresh();
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : "Не удалось загрузить изображение");
    } finally {
      setAvatarBusy(false);
    }
  }

  async function removeAvatar() {
    setAvatarBusy(true);
    setAvatarError(null);
    try {
      await api.del("/api/profile/avatar");
      await refresh();
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : "Не удалось удалить");
    } finally {
      setAvatarBusy(false);
    }
  }

  return (
    <div className="pt-6">
      <Breadcrumbs items={[{ label: "Главная", to: "/projects" }, { label: "Личный кабинет" }]} />

      <div className="mt-4 grid gap-6 xl:grid-cols-[340px_1fr]">
        <aside className="flex flex-col gap-4">
          <section className="rounded-[26px] border border-surface-line bg-white p-6 shadow-card">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="relative">
                <UserAvatar user={user} size={96} className="ring-4 ring-brand-50" />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={avatarBusy}
                  className="absolute -bottom-1 -right-1 grid h-9 w-9 place-items-center rounded-full border-2 border-white bg-brand-500 text-white shadow-soft hover:bg-brand-600 disabled:opacity-60"
                  title="Загрузить фото"
                >
                  <Icon name="upload" size={14} />
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadAvatar(file);
                  e.target.value = "";
                }}
              />
              <div>
                <h2 className="text-[20px] font-bold text-ink-900">{user.full_name}</h2>
                <p className="text-sm text-ink-500">{user.email}</p>
              </div>
              <span className={`chip ${ROLE_CHIP[user.role]}`}>{ROLE_LABEL[user.role]}</span>
              {user.avatar_url && (
                <button
                  type="button"
                  onClick={removeAvatar}
                  disabled={avatarBusy}
                  className="inline-flex items-center gap-1 text-xs font-medium text-ink-500 hover:text-accent-red disabled:opacity-60"
                >
                  <Icon name="trash" size={12} /> Удалить фото
                </button>
              )}
              {avatarError && (
                <p className="flex items-center gap-1 text-xs text-accent-red">
                  <Icon name="warn" size={12} /> {avatarError}
                </p>
              )}
              <p className="text-xs text-ink-400">PNG, JPG, WEBP, GIF, SVG · до 2 МБ</p>
            </div>
            <dl className="mt-6 space-y-2 text-sm">
              <InfoRow icon="mail" label="Почта" value={user.email} />
              <InfoRow icon="users" label="Отдел" value={user.department || "—"} />
              <InfoRow icon="user" label="Должность" value={user.position || "—"} />
              <InfoRow icon="shield" label="Доступ" value={user.is_active ? "Активен" : "Отключён"} />
            </dl>
          </section>

          <section className="rounded-[26px] border border-surface-line bg-white p-6 shadow-card">
            <h3 className="flex items-center gap-2 text-[16px] font-bold text-ink-900">
              <Icon name="kanban" size={16} className="text-brand-500" /> Мои проекты
            </h3>
            <ul className="mt-3 space-y-2">
              {myProjects.map((p) => (
                <li key={p.id}>
                  <Link
                    to={`/projects/${p.id}`}
                    className="flex items-center gap-3 rounded-xl border border-surface-line p-2 hover:bg-surface-muted"
                  >
                    <span className="h-8 w-8 rounded-lg" style={{ background: p.color }} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink-900">{p.title}</p>
                      <p className="truncate text-xs text-ink-500">{p.articles_count} материалов</p>
                    </div>
                    <Icon name="chevron-right" size={14} className="text-ink-400" />
                  </Link>
                </li>
              ))}
              {myProjects.length === 0 && (
                <li className="rounded-xl border border-dashed border-surface-line p-4 text-center text-xs text-ink-500">
                  У вас пока нет назначенных проектов
                </li>
              )}
            </ul>
          </section>
        </aside>

        <div className="flex flex-col gap-6">
          <section className="rounded-[26px] border border-surface-line bg-white p-6 shadow-card">
            <h1 className="flex items-center gap-2 text-[24px] font-bold text-ink-900">
              <Icon name="user" size={18} className="text-brand-500" /> Персональные данные
            </h1>
            <p className="mt-1 text-sm text-ink-500">
              Обновите имя, контакты и краткое описание, которые видят коллеги.
            </p>
            <form onSubmit={saveProfile} className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="field-label">ФИО</label>
                <input required className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
              <div>
                <label className="field-label">Отдел</label>
                <input className="input" value={department} onChange={(e) => setDepartment(e.target.value)} />
              </div>
              <div>
                <label className="field-label">Должность</label>
                <input className="input" value={position} onChange={(e) => setPosition(e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <label className="field-label">Телефон</label>
                <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+7 (___) ___-__-__" />
              </div>
              <div className="md:col-span-2">
                <label className="field-label">О себе</label>
                <textarea
                  className="input min-h-[100px]"
                  value={about}
                  onChange={(e) => setAbout(e.target.value)}
                  placeholder="Короткое описание, чем вы занимаетесь."
                />
              </div>
              {profileStatus && (
                <div
                  className={`md:col-span-2 flex items-center gap-2 rounded-2xl px-4 py-3 text-sm ${
                    profileStatus.kind === "ok"
                      ? "bg-accent-greenBg text-accent-green"
                      : "bg-accent-redBg text-accent-red"
                  }`}
                >
                  <Icon name={profileStatus.kind === "ok" ? "check" : "warn"} size={14} /> {profileStatus.text}
                </div>
              )}
              <div className="md:col-span-2 flex justify-end">
                <button type="submit" disabled={savingProfile} className="btn-primary disabled:opacity-60">
                  <Icon name="save" size={16} className="mr-2" />
                  {savingProfile ? "Сохраняем…" : "Сохранить изменения"}
                </button>
              </div>
            </form>
          </section>

          <section className="rounded-[26px] border border-surface-line bg-white p-6 shadow-card">
            <h1 className="flex items-center gap-2 text-[24px] font-bold text-ink-900">
              <Icon name="key" size={18} className="text-brand-500" /> Смена пароля
            </h1>
            <p className="mt-1 text-sm text-ink-500">Используйте длинный пароль и не используйте его в других сервисах.</p>
            <form onSubmit={changePassword} className="mt-5 grid max-w-[540px] gap-4">
              <div>
                <label className="field-label">Текущий пароль</label>
                <input required type="password" className="input" value={current} onChange={(e) => setCurrent(e.target.value)} />
              </div>
              <div>
                <label className="field-label">Новый пароль</label>
                <input required type="password" className="input" value={next} onChange={(e) => setNext(e.target.value)} />
              </div>
              <div>
                <label className="field-label">Подтверждение</label>
                <input required type="password" className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              </div>
              {pwStatus && (
                <div
                  className={`flex items-center gap-2 rounded-2xl px-4 py-3 text-sm ${
                    pwStatus.kind === "ok" ? "bg-accent-greenBg text-accent-green" : "bg-accent-redBg text-accent-red"
                  }`}
                >
                  <Icon name={pwStatus.kind === "ok" ? "check" : "warn"} size={14} /> {pwStatus.text}
                </div>
              )}
              <div className="flex justify-end">
                <button type="submit" disabled={savingPw} className="btn-primary disabled:opacity-60">
                  {savingPw ? "Сохраняем…" : "Обновить пароль"}
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-surface-muted p-3">
      <div className="grid h-8 w-8 place-items-center rounded-lg bg-white text-brand-500">
        <Icon name={icon} size={14} />
      </div>
      <div className="min-w-0">
        <dt className="text-xs font-medium text-ink-500">{label}</dt>
        <dd className="truncate text-[15px] font-semibold text-ink-900">{value}</dd>
      </div>
    </div>
  );
}
