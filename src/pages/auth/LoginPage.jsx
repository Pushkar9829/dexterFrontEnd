import { useState } from "react";
import { Field } from "../../components/common/Field.jsx";
import { InstallButton } from "../../components/layout/InstallButton.jsx";
import { OfflineBanner } from "../../components/layout/OfflineBanner.jsx";
import { api, setToken } from "../../services/api.js";
import { DEMO_ENABLED, DEMO_LOGINS } from "./demoLogins.js";

export function LoginPage({ onLoggedIn, error, setError, notice, setNotice }) {
  const [login, setLogin] = useState(DEMO_ENABLED ? "admin@demo.local" : "");
  const [password, setPassword] = useState(DEMO_ENABLED ? "Admin@123" : "");
  const [ticket, setTicket] = useState("");
  const [otp, setOtp] = useState("");
  const [otpDemo, setOtpDemo] = useState("");
  const [useRecovery, setUseRecovery] = useState(false);
  const [resetMode, setResetMode] = useState(false);

  function cancelTicket() {
    setTicket("");
    setOtp("");
    setOtpDemo("");
    setUseRecovery(false);
    setResetMode(false);
    setError("");
    setNotice("");
  }

  async function doLogin(e) {
    e.preventDefault();
    setError("");
    try {
      const data = await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ login, password }),
      });
      if (data.token) {
        setToken(data.token);
        onLoggedIn(data.user);
        return;
      }
      setTicket(data.ticket);
      setUseRecovery(false);
      setOtpDemo(data.otpDemo || "");
      setOtp(data.otpDemo || "");
      setNotice(data.message || "Enter MFA code");
    } catch (err) {
      setError(err.message);
    }
  }

  async function doMfa(e) {
    e.preventDefault();
    setError("");
    try {
      const data = await api("/api/auth/mfa", {
        method: "POST",
        body: JSON.stringify(useRecovery ? { ticket, recoveryCode: otp } : { ticket, otp }),
      });
      setToken(data.token);
      onLoggedIn(data.user);
      setTicket("");
      setNotice("");
    } catch (err) {
      setError(err.message);
    }
  }

  async function doForgot(e) {
    e.preventDefault();
    setError("");
    try {
      const data = await api("/api/auth/forgot", {
        method: "POST",
        body: JSON.stringify({ login }),
      });
      setTicket(data.ticket || "");
      setOtpDemo(data.otpDemo || "");
      setOtp(data.otpDemo || "");
      setNotice((data.message || "If the login exists, a reset code was sent") + ". Set a new password.");
    } catch (err) {
      setError(err.message);
    }
  }

  async function doReset(e) {
    e.preventDefault();
    setError("");
    try {
      await api("/api/auth/reset", {
        method: "POST",
        body: JSON.stringify({ ticket, otp, password }),
      });
      setResetMode(false);
      setTicket("");
      setNotice("Password updated. Log in with MFA.");
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className={"wrap login" + (DEMO_LOGINS.length ? " with-demo" : "")}>
      <div className="login-main">
      <h1>Dexter India CRM</h1>
      <OfflineBanner />
      <p className="meta">
        ATM franchise, field visit and inspection CRM. <InstallButton />
      </p>
      <div className="card">
        {!ticket && !resetMode ? (
          <form onSubmit={doLogin}>
            <Field label="Login (email or mobile)" value={login} onChange={setLogin} />
            <Field label="Password" value={password} onChange={setPassword} type="password" />
            <p>
              <button className="btn" type="submit">
                Continue
              </button>{" "}
              <button className="btn" type="button" onClick={() => setResetMode(true)}>
                Forgot password
              </button>
            </p>
          </form>
        ) : resetMode && !ticket ? (
          <form onSubmit={doForgot}>
            {notice ? <p className="ok">{notice}</p> : null}
            <Field label="Login" value={login} onChange={setLogin} />
            <p>
              <button className="btn" type="submit">
                Send reset code
              </button>{" "}
              <button className="btn" type="button" onClick={() => setResetMode(false)}>
                Back
              </button>
            </p>
          </form>
        ) : resetMode && ticket ? (
          <form onSubmit={doReset}>
            <p className="ok">{notice}</p>
            {otpDemo ? <p className="meta">Demo OTP: {otpDemo}</p> : null}
            <Field label="Reset code" value={otp} onChange={setOtp} />
            <Field label="New password" value={password} onChange={setPassword} type="password" />
            <p>
              <button className="btn" type="submit">
                Set password
              </button>{" "}
              <button className="btn" type="button" onClick={cancelTicket}>
                Back
              </button>
            </p>
          </form>
        ) : (
          <form onSubmit={doMfa}>
            <p className="ok">{notice}</p>
            {otpDemo && !useRecovery ? <p className="meta">Demo OTP: {otpDemo}</p> : null}
            <Field label={useRecovery ? "Recovery code (XXXX-XXXX)" : "MFA code"} value={otp} onChange={setOtp} />
            <p>
              <button className="btn" type="submit">
                Verify MFA
              </button>{" "}
              <button
                className="btn"
                type="button"
                onClick={() => {
                  setUseRecovery(!useRecovery);
                  setOtp("");
                }}
              >
                {useRecovery ? "Use the code instead" : "Use a recovery code"}
              </button>{" "}
              <button className="btn" type="button" onClick={cancelTicket}>
                Back
              </button>
            </p>
          </form>
        )}
        {error ? <p className="err">{error}</p> : null}
      </div>
      </div>
      {DEMO_LOGINS.length && !ticket && !resetMode ? (
        <div className="card demo-logins">
          <h3>Demo logins</h3>
          <p className="meta">Click a role to fill its ID and password, then press Continue.</p>
          <div className="demo-cols">
          {DEMO_LOGINS.map(([group, color, users]) => (
            <div key={group} className="demo-col" style={{ "--accent": color }}>
              <h4>{group}</h4>
              <div className="demo-grid">
                {users.map(([label, id, pw]) => (
                  <button
                    key={id}
                    type="button"
                    className={"demo-user" + (login === id ? " active" : "")}
                    onClick={() => {
                      setLogin(id);
                      setPassword(pw);
                      setError("");
                    }}
                  >
                    <strong>{label}</strong>
                    <span className="meta">
                      {id} · {pw}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
