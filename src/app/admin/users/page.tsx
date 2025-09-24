"use client";

import { useEffect, useState } from "react";

type AdminUser = {
  id: string;
  address: string;
  role: string;
  isVerifiedDid: boolean;
  didHash: string | null;
  profileCid: string | null;
  avatarCid: string | null;
  cvCid: string | null;
  headline: string | null;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/admin/users?limit=50", { cache: "no-store" });
        const data = await res.json();
        setUsers(data.users || []);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">User management</h1>
      {loading ? (
        <div className="text-muted-foreground">Loading users...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-border">
                <th className="py-2 pr-4">Address</th>
                <th className="py-2 pr-4">Role</th>
                <th className="py-2 pr-4">Verified</th>
                <th className="py-2 pr-4">Headline</th>
                <th className="py-2 pr-4">Created</th>
                <th className="py-2 pr-4">Last Login</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-border/60">
                  <td className="py-2 pr-4 font-mono">{u.address}</td>
                  <td className="py-2 pr-4">{u.role}</td>
                  <td className="py-2 pr-4">{u.isVerifiedDid ? "Yes" : "No"}</td>
                  <td className="py-2 pr-4 truncate max-w-[240px]">{u.headline || ""}</td>
                  <td className="py-2 pr-4">{new Date(u.createdAt).toLocaleString()}</td>
                  <td className="py-2 pr-4">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}


