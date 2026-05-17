"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function RegisterForm() {
  const { register, user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultRole = searchParams.get("role") === "OWNER" ? "OWNER" : "CUSTOMER";

  useEffect(() => {
    if (!authLoading && user) {
      router.push(user.role === "OWNER" ? "/dashboard" : "/");
    }
  }, [authLoading, user, router]);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    role: defaultRole,
  });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const validations = {
    name: form.name.length >= 2,
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email),
    password: form.password.length >= 8,
    phone: /^\+[0-9]{7,15}$/.test(form.phone),
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await register(form);
      if (user.role === "OWNER") {
        router.push("/dashboard");
      } else {
        router.push("/");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl text-center">Register</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded text-sm">{error}</div>
          )}
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              onBlur={() => setTouched((t) => ({ ...t, name: true }))}
              required
            />
            {touched.name && !validations.name && (
              <p className="text-xs text-red-500">Minimum 2 characters</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              onBlur={() => setTouched((t) => ({ ...t, email: true }))}
              required
            />
            {touched.email && !validations.email && (
              <p className="text-xs text-red-500">Enter a valid email address</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              onBlur={() => setTouched((t) => ({ ...t, password: true }))}
              required
            />
            <p className={`text-xs ${form.password.length === 0 ? "text-gray-400" : validations.password ? "text-green-600" : "text-red-500"}`}>
              Minimum 8 characters{validations.password ? " ✓" : ""}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+447700900123"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
              required
            />
            {touched.phone && !validations.phone && (
              <p className="text-xs text-red-500">Include country code, e.g. +447700900123</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Account Type</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="role"
                  value="CUSTOMER"
                  checked={form.role === "CUSTOMER"}
                  onChange={() => setForm({ ...form, role: "CUSTOMER" })}
                />
                Customer
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="role"
                  value="OWNER"
                  checked={form.role === "OWNER"}
                  onChange={() => setForm({ ...form, role: "OWNER" })}
                />
                Restaurant Owner
              </label>
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={loading || !validations.name || !validations.email || !validations.password || !validations.phone}>
            {loading ? "Creating account..." : "Register"}
          </Button>
          <p className="text-center text-sm text-gray-600">
            Already have an account?{" "}
            <Link href="/login" className="text-amber-600 hover:underline">
              Login
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}

export default function RegisterPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50/40 via-white to-orange-50/30">
      <Suspense fallback={<div>Loading...</div>}>
        <RegisterForm />
      </Suspense>
    </main>
  );
}
