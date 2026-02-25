'use client';

import { useState } from 'react';
import { User, UserRole } from './types';
import UserActivityModal from './UserActivityModal';

const MOCK_USERS: User[] = [
  {
    id: '1',
    name: 'Alice Johnson',
    email: 'alice@example.com',
    role: 'admin',
    isActive: true,
    isIssuer: true,
    isAdmin: true,
    createdAt: '2024-01-10',
    lastActive: '2025-02-20',
    activities: [
      { id: 'a1', action: 'Issued Certificate', timestamp: '2025-02-20T10:30:00Z', details: 'Issued certificate #C-2024-001' },
      { id: 'a2', action: 'Updated Role', timestamp: '2025-02-18T08:00:00Z', details: 'Changed user Bob to issuer role' },
    ],
  },
  {
    id: '2',
    name: 'Bob Martinez',
    email: 'bob@example.com',
    role: 'issuer',
    isActive: true,
    isIssuer: true,
    isAdmin: false,
    createdAt: '2024-03-05',
    lastActive: '2025-02-19',
    activities: [
      { id: 'b1', action: 'Issued Certificate', timestamp: '2025-02-19T14:00:00Z', details: 'Issued certificate #C-2024-009' },
    ],
  },
  {
    id: '3',
    name: 'Carol White',
    email: 'carol@example.com',
    role: 'user',
    isActive: false,
    isIssuer: false,
    isAdmin: false,
    createdAt: '2024-06-15',
    lastActive: '2024-12-01',
    activities: [],
  },
  {
    id: '4',
    name: 'David Kim',
    email: 'david@example.com',
    role: 'viewer',
    isActive: true,
    isIssuer: false,
    isAdmin: false,
    createdAt: '2024-09-22',
    lastActive: '2025-02-21',
    activities: [
      { id: 'd1', action: 'Viewed Certificate', timestamp: '2025-02-21T09:15:00Z', details: 'Viewed certificate #C-2024-003' },
    ],
  },
];

const ROLES: UserRole[] = ['admin', 'issuer', 'user', 'viewer'];

const roleBadgeClass: Record<UserRole, string> = {
  admin: 'bg-purple-100 text-purple-700',
  issuer: 'bg-blue-100 text-blue-700',
  user: 'bg-gray-100 text-gray-600',
  viewer: 'bg-yellow-100 text-yellow-700',
};

interface ToggleProps {
  enabled: boolean;
  onChange: (val: boolean) => void;
}

function Toggle({ enabled, onChange }: ToggleProps) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
        enabled ? 'bg-green-500' : 'bg-gray-300'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          enabled ? 'translate-x-4' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  function updateUser(id: string, patch: Partial<User>) {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-sm text-gray-500 mt-1">{users.length} total users</p>
        </div>
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-72 px-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-5 py-3 text-left">User</th>
              <th className="px-5 py-3 text-left">Role</th>
              <th className="px-5 py-3 text-center">Active</th>
              <th className="px-5 py-3 text-center">Issuer</th>
              <th className="px-5 py-3 text-center">Admin</th>
              <th className="px-5 py-3 text-left">Last Active</th>
              <th className="px-5 py-3 text-center">Activity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-10 text-gray-400">
                  No users found.
                </td>
              </tr>
            ) : (
              filtered.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-4">
                    <div>
                      <p className="font-medium text-gray-800">{user.name}</p>
                      <p className="text-gray-400 text-xs">{user.email}</p>
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    <select
                      value={user.role}
                      onChange={(e) => updateUser(user.id, { role: e.target.value as UserRole })}
                      className={`text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400 ${roleBadgeClass[user.role]}`}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r.charAt(0).toUpperCase() + r.slice(1)}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td className="px-5 py-4 text-center">
                    <Toggle
                      enabled={user.isActive}
                      onChange={(val) => updateUser(user.id, { isActive: val })}
                    />
                  </td>

                  <td className="px-5 py-4 text-center">
                    <Toggle
                      enabled={user.isIssuer}
                      onChange={(val) => updateUser(user.id, { isIssuer: val })}
                    />
                  </td>

                  <td className="px-5 py-4 text-center">
                    <Toggle
                      enabled={user.isAdmin}
                      onChange={(val) => updateUser(user.id, { isAdmin: val })}
                    />
                  </td>

                  <td className="px-5 py-4 text-gray-500 text-xs">
                    {new Date(user.lastActive).toLocaleDateString()}
                  </td>

                  <td className="px-5 py-4 text-center">
                    <button
                      onClick={() => setSelectedUser(user)}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      View ({user.activities.length})
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedUser && (
        <UserActivityModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
        />
      )}
    </div>
  );
}
