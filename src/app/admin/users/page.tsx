"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

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
  summary?: string | null;
  education?: string | null;
  experience?: string | null;
  links?: string[] | null;
  skills?: string[] | null;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState<string>("");
  const [showDetails, setShowDetails] = useState<boolean>(false);
  const [showCids, setShowCids] = useState<boolean>(true);

  const shorten = (addr: string) => (addr?.length > 12 ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : addr);
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied address to clipboard");
    } catch {
      toast.error("Copy failed");
    }
  };
  const shortenCid = (cid: string) => (cid?.length > 16 ? `${cid.slice(0, 8)}...${cid.slice(-6)}` : cid);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set('limit', '50');
        if (query.trim()) params.set('q', query.trim());
        if (showDetails) params.set('include', 'details');
        const res = await fetch(`/api/admin/users?${params.toString()}`, { cache: "no-store" });
        const data = await res.json();
        setUsers(data.users || []);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [query, showDetails]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3">
        <h1 className="text-2xl font-semibold">User management</h1>
        <div className="flex items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search address or headline..."
            className="px-3 py-2 rounded border border-border bg-background outline-none text-sm"
          />
          <label className="text-sm flex items-center gap-2">
            <input type="checkbox" checked={showDetails} onChange={(e) => setShowDetails(e.target.checked)} />
            Include profile details
          </label>
          <label className="text-sm flex items-center gap-2">
            <input type="checkbox" checked={showCids} onChange={(e) => setShowCids(e.target.checked)} />
            Show CIDs
          </label>
        </div>
      </div>
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
                {showDetails && (
                  <>
                    <th className="py-2 pr-4">Skills</th>
                    <th className="py-2 pr-4">Links</th>
                  </>
                )}
                {showCids && (
                  <>
                    <th className="py-2 pr-4">Profile CID</th>
                    <th className="py-2 pr-4">Avatar CID</th>
                    <th className="py-2 pr-4">CV CID</th>
                  </>
                )}
                <th className="py-2 pr-4">Created</th>
                <th className="py-2 pr-4">Updated</th>
                <th className="py-2 pr-4">Last Login</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-border/60">
                  <td className="py-2 pr-4 font-mono">
                    <button
                      type="button"
                      className="hover:underline"
                      onClick={() => copy(u.address)}
                      title="Click to copy"
                    >
                      {shorten(u.address)}
                    </button>
                  </td>
                  <td className="py-2 pr-4">{u.role}</td>
                  <td className="py-2 pr-4">{u.isVerifiedDid ? "Yes" : "No"}</td>
                  <td className="py-2 pr-4 truncate max-w-[240px]">{u.headline || ""}</td>
                  {showDetails && (
                    <>
                      <td className="py-2 pr-4 truncate max-w-[260px]">{(u.skills || [])?.join(', ')}</td>
                      <td className="py-2 pr-4 truncate max-w-[260px]">{(u.links || [])?.join(', ')}</td>
                    </>
                  )}
                  {showCids && (
                    <>
                      <td className="py-2 pr-4 font-mono truncate max-w-[220px]">
                        {u.profileCid ? (
                          <button
                            type="button"
                            className="hover:underline"
                            onClick={() => copy(u.profileCid!)}
                            title="Click to copy"
                          >
                            {shortenCid(u.profileCid!)}
                          </button>
                        ) : ''}
                      </td>
                      <td className="py-2 pr-4 font-mono truncate max-w-[220px]">
                        {u.avatarCid ? (
                          <button
                            type="button"
                            className="hover:underline"
                            onClick={() => copy(u.avatarCid!)}
                            title="Click to copy"
                          >
                            {shortenCid(u.avatarCid!)}
                          </button>
                        ) : ''}
                      </td>
                      <td className="py-2 pr-4 font-mono truncate max-w-[220px]">
                        {u.cvCid ? (
                          <button
                            type="button"
                            className="hover:underline"
                            onClick={() => copy(u.cvCid!)}
                            title="Click to copy"
                          >
                            {shortenCid(u.cvCid!)}
                          </button>
                        ) : ''}
                      </td>
                    </>
                  )}
                  <td className="py-2 pr-4">{new Date(u.createdAt).toLocaleString()}</td>
                  <td className="py-2 pr-4">{new Date(u.updatedAt).toLocaleString()}</td>
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


