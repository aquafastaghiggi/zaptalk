from email.message import EmailMessage
import smtplib
import ssl

from app.core.config import settings


def _frontend_url(path: str) -> str:
    base = settings.FRONTEND_PUBLIC_URL.rstrip("/")
    normalized = path if path.startswith("/") else f"/{path}"
    return f"{base}{normalized}"


def _build_message(subject: str, recipient_email: str, html_body: str, text_body: str) -> EmailMessage:
    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = (
        f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
        if settings.SMTP_FROM_NAME
        else settings.SMTP_FROM_EMAIL
    )
    message["To"] = recipient_email
    message.set_content(text_body)
    message.add_alternative(html_body, subtype="html")
    return message


def _send_message(message: EmailMessage) -> tuple[bool, str]:
    if not settings.SMTP_HOST or not settings.SMTP_FROM_EMAIL:
        return False, "SMTP não configurado."

    try:
        if settings.SMTP_USE_SSL:
            context = ssl.create_default_context()
            with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, context=context) as smtp:
                if settings.SMTP_USERNAME:
                    smtp.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
                smtp.send_message(message)
        else:
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as smtp:
                smtp.ehlo()
                if settings.SMTP_USE_TLS:
                    smtp.starttls(context=ssl.create_default_context())
                    smtp.ehlo()
                if settings.SMTP_USERNAME:
                    smtp.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
                smtp.send_message(message)
        return True, "E-mail enviado com sucesso."
    except Exception as exc:  # pragma: no cover - defensive
        return False, str(exc)


def send_invitation_email(name: str, email: str, token: str, expires_at) -> tuple[bool, str]:
    invite_url = _frontend_url(f"/invite/{token}")
    subject = f"Seu acesso ao {settings.APP_NAME} está pronto"
    text_body = (
        f"Olá, {name}!\n\n"
        f"Seu convite para acessar o {settings.APP_NAME} está pronto.\n"
        f"Abra o link abaixo para definir sua senha:\n{invite_url}\n\n"
        f"Esse convite expira em {expires_at}.\n"
    )
    html_body = f"""
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
      <h2 style="margin:0 0 12px">Seu acesso ao {settings.APP_NAME} está pronto</h2>
      <p>Olá, {name}!</p>
      <p>Use o botão abaixo para definir sua senha e confirmar seu cadastro.</p>
      <p>
        <a href="{invite_url}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px">
          Confirmar cadastro
        </a>
      </p>
      <p style="color:#6b7280">Se o botão não abrir, copie e cole este link:<br>{invite_url}</p>
      <p style="color:#6b7280">Esse convite expira em {expires_at}.</p>
    </div>
    """
    message = _build_message(subject, email, html_body, text_body)
    return _send_message(message)


def send_password_reset_email(name: str, email: str, reset_token: str, expires_at) -> tuple[bool, str]:
    reset_url = _frontend_url(f"/reset-password/{reset_token}")
    subject = f"Redefinição de senha do {settings.APP_NAME}"
    text_body = (
        f"Olá, {name}!\n\n"
        f"Recebemos uma solicitação para redefinir sua senha.\n"
        f"Acesse o link abaixo para continuar:\n{reset_url}\n\n"
        f"Esse link expira em {expires_at}.\n"
    )
    html_body = f"""
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
      <h2 style="margin:0 0 12px">Redefinição de senha</h2>
      <p>Olá, {name}!</p>
      <p>Recebemos uma solicitação para redefinir sua senha.</p>
      <p>
        <a href="{reset_url}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px">
          Redefinir senha
        </a>
      </p>
      <p style="color:#6b7280">Se o botão não abrir, copie e cole este link:<br>{reset_url}</p>
      <p style="color:#6b7280">Esse link expira em {expires_at}.</p>
    </div>
    """
    message = _build_message(subject, email, html_body, text_body)
    return _send_message(message)
