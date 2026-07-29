import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PhoneOtpForm } from "@/components/auth/phone-otp-form";
import { EmailRegisterForm } from "@/components/auth/email-register-form";

export default function CustomerRegisterPage() {
  return (
    <div className="mx-auto w-full max-w-sm space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Book your first ride</h1>
        <p className="text-sm text-muted-foreground">Create a customer account in seconds.</p>
      </div>

      <Tabs defaultValue="phone">
        <TabsList className="w-full">
          <TabsTrigger value="phone" className="flex-1">
            Phone
          </TabsTrigger>
          <TabsTrigger value="email" className="flex-1">
            Email
          </TabsTrigger>
        </TabsList>
        <TabsContent value="phone" className="pt-4">
          <PhoneOtpForm intent="register" />
        </TabsContent>
        <TabsContent value="email" className="pt-4">
          <EmailRegisterForm />
        </TabsContent>
      </Tabs>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
