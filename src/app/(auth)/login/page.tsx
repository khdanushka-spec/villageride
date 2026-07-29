import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmailLoginForm } from "@/components/auth/email-login-form";
import { PhoneOtpForm } from "@/components/auth/phone-otp-form";

export default function LoginPage() {
  return (
    <div className="mx-auto w-full max-w-sm space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-sm text-muted-foreground">Sign in to book rides or manage your fleet.</p>
      </div>

      <Tabs defaultValue="email">
        <TabsList className="w-full">
          <TabsTrigger value="email" className="flex-1">
            Email
          </TabsTrigger>
          <TabsTrigger value="phone" className="flex-1">
            Phone
          </TabsTrigger>
        </TabsList>
        <TabsContent value="email" className="pt-4">
          <EmailLoginForm />
        </TabsContent>
        <TabsContent value="phone" className="pt-4">
          <PhoneOtpForm intent="login" />
        </TabsContent>
      </Tabs>

      <p className="text-center text-sm text-muted-foreground">
        New to VillageRide?{" "}
        <Link href="/register" className="font-medium text-primary hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
