"use client";

import { useActionState, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPhoneOtpAction, verifyPhoneOtpAction, type ActionState } from "@/actions/auth";
import { useActionRedirect } from "@/hooks/use-action-redirect";

export function PhoneOtpForm({ intent }: { intent: "login" | "register" }) {
  const [phone, setPhone] = useState("");
  const [codeSent, setCodeSent] = useState(false);

  const [requestState, requestAction, requestPending] = useActionState<ActionState, FormData>(
    async (_prev, formData) => {
      const value = String(formData.get("phone") ?? "");
      const result = await requestPhoneOtpAction(value, intent);
      if (result && !result.error) {
        setPhone(value);
        setCodeSent(true);
      }
      return result;
    },
    undefined
  );

  const [verifyState, verifyAction, verifyPending] = useActionState<ActionState, FormData>(
    verifyPhoneOtpAction,
    undefined
  );
  useActionRedirect(verifyState?.redirectTo);

  if (!codeSent) {
    return (
      <form action={requestAction} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="phone">Mobile number</Label>
          <Input id="phone" name="phone" type="tel" placeholder="07X XXX XXXX" required autoComplete="tel" />
        </div>
        {requestState?.error && <p className="text-sm text-destructive">{requestState.error}</p>}
        <Button type="submit" className="w-full" disabled={requestPending}>
          {requestPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Send verification code
        </Button>
      </form>
    );
  }

  return (
    <form action={verifyAction} className="space-y-4">
      <input type="hidden" name="phone" value={phone} />
      <input type="hidden" name="intent" value={intent} />
      <p className="text-sm text-muted-foreground">
        Enter the 6-digit code sent to <span className="font-medium text-foreground">{phone}</span>.
      </p>
      {intent === "register" && (
        <div className="space-y-2">
          <Label htmlFor="name">Full name</Label>
          <Input id="name" name="name" placeholder="Your name" required />
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="code">Verification code</Label>
        <Input
          id="code"
          name="code"
          inputMode="numeric"
          maxLength={6}
          placeholder="123456"
          required
          autoComplete="one-time-code"
        />
      </div>
      {verifyState?.error && <p className="text-sm text-destructive">{verifyState.error}</p>}
      <Button type="submit" className="w-full" disabled={verifyPending}>
        {verifyPending && <Loader2 className="h-4 w-4 animate-spin" />}
        {intent === "register" ? "Create account" : "Sign in"}
      </Button>
      <button
        type="button"
        onClick={() => setCodeSent(false)}
        className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
      >
        Use a different number
      </button>
    </form>
  );
}
