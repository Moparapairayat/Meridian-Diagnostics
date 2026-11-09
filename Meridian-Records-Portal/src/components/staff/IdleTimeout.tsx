'use client';

import { useEffect, useRef, useState } from 'react';
import { IDLE_HEARTBEAT_MS, IDLE_TIMEOUT_MS } from '@/lib/auth/idle';
import { touchActivity } from '@/app/staff/actions';

const WARNING_MS = 60 * 1000;
const EVENTS = ['pointerdown', 'keydown', 'scroll', 'touchstart', 'mousemove'] as const;

/**
 * Client half of the 15-minute idle timeout (SPEC 7.6). Activity is reported
 * to the server at most once a minute; the server re-checks on every request.
 * Sign-out posts a hidden form to the /auth/signout route handler.
 */
export function IdleTimeout() {
  const lastActivity = useRef(0);
  const lastReported = useRef(0);
  const signOutForm = useRef<HTMLFormElement>(null);
  const [warning, setWarning] = useState(false);

  useEffect(() => {
    const start = Date.now();
    lastActivity.current = start;
    lastReported.current = start;
    const signOut = () => signOutForm.current?.requestSubmit();

    const onActivity = () => {
      const now = Date.now();
      lastActivity.current = now;
      setWarning(false);
      if (now - lastReported.current >= IDLE_HEARTBEAT_MS) {
        lastReported.current = now;
        touchActivity()
          .then((res) => {
            if (!res.ok) signOut();
          })
          .catch(() => {
            // Network hiccup: the server re-check still protects the session.
          });
      }
    };

    const tick = () => {
      const idleFor = Date.now() - lastActivity.current;
      if (idleFor >= IDLE_TIMEOUT_MS) signOut();
      else setWarning(idleFor >= IDLE_TIMEOUT_MS - WARNING_MS);
    };

    EVENTS.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    document.addEventListener('visibilitychange', tick);
    const timer = window.setInterval(tick, 5000);
    return () => {
      EVENTS.forEach((e) => window.removeEventListener(e, onActivity));
      document.removeEventListener('visibilitychange', tick);
      window.clearInterval(timer);
    };
  }, []);

  return (
    <>
      <form ref={signOutForm} action="/auth/signout?reason=idle" method="post" hidden />
      {warning && (
        <div
          role="alert"
          className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md rounded-lg border-l-4 border-warning-border bg-warning-bg p-4 text-warning-fg shadow-lg"
        >
          <p className="font-semibold">You will be signed out in less than a minute.</p>
          <p className="text-sm">Move the mouse or press a key to stay signed in.</p>
        </div>
      )}
    </>
  );
}
