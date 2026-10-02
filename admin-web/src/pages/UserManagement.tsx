// admin-web/src/pages/UserManagement.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  UserPlus,
  Edit3,
  Key,
  UserX,
  UserCheck,
  X,
  FileSpreadsheet,
  LogOut,
  Upload,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Shield,
  Users,
  GraduationCap,
  School,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  getUsers,
  createUser,
  updateUser,
  deactivateUser,
  resetUserPassword,
  bulkUploadUsers,
} from '../api/users';
import type { ManagedUser, UserRole, BulkUploadResult } from '../types/users';

function formatApiError(data: any): string {
  if (!data || typeof data !== 'object') return 'Something went wrong.';
  if (data.detail) return data.detail;

  const messages: string[] = [];
  for (const [field, value] of Object.entries(data)) {
    const fieldMessages = Array.isArray(value) ? value : [String(value)];
    fieldMessages.forEach((msg) => {
      const label = field.charAt(0).toUpperCase() + field.slice(1).replace(/_/g, ' ');
      messages.push(`${label}: ${msg}`);
    });
  }
  return messages.join('\n') || 'Something went wrong.';
}

export default function UserManagement() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { showToast } = useToast();

  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters & Search
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [searchText, setSearchText] = useState('');

  // Table Selection & Pagination
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Modals & Upload State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [resetResult, setResetResult] = useState<{ username: string; password: string } | null>(null);

  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [bulkResult, setBulkResult] = useState<BulkUploadResult | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const data = await getUsers();
      setUsers(data);
    } catch (e: any) {
      setError(formatApiError(e?.response?.data));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Quick Role Counts
  const totalUsersCount = users.length;
  const studentCount = users.filter((u) => u.role === 'student').length;
  const teacherCount = users.filter((u) => u.role === 'teacher').length;
  const adminCount = users.filter((u) => u.role === 'admin').length;

  // Filter Logic
  const filteredUsers = users.filter((u) => {
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && u.is_active) ||
      (statusFilter === 'inactive' && !u.is_active);

    const fullName = u.profile ? `${u.profile.first_name} ${u.profile.last_name}` : '';
    const email = u.profile?.email || '';
    const matchesSearch =
      searchText === '' ||
      u.username.toLowerCase().includes(searchText.toLowerCase()) ||
      fullName.toLowerCase().includes(searchText.toLowerCase()) ||
      email.toLowerCase().includes(searchText.toLowerCase());

    return matchesRole && matchesStatus && matchesSearch;
  });

  // Pagination Logic
  const totalRows = filteredUsers.length;
  const totalPages = Math.ceil(totalRows / rowsPerPage) || 1;
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + rowsPerPage);

  // Select All Toggle
  const isAllSelected =
    paginatedUsers.length > 0 && paginatedUsers.every((u) => selectedIds.includes(u.id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds((prev) => prev.filter((id) => !paginatedUsers.some((u) => u.id === id)));
    } else {
      const currentPageIds = paginatedUsers.map((u) => u.id);
      setSelectedIds((prev) => Array.from(new Set([...prev, ...currentPageIds])));
    }
  };

  const toggleSelectRow = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Actions
  async function handleToggleActive(user: ManagedUser) {
    try {
      if (user.is_active) {
        await deactivateUser(user.id);
        showToast(`${user.username} deactivated.`, 'success');
      } else {
        await updateUser(user.id, { is_active: true });
        showToast(`${user.username} reactivated.`, 'success');
      }
      await load();
    } catch (e: any) {
      showToast(formatApiError(e?.response?.data), 'error');
    }
  }

  async function handleResetPassword(user: ManagedUser) {
    if (!confirm(`Reset password for ${user.username}? This will invalidate their current session.`)) return;
    try {
      const result = await resetUserPassword(user.id);
      setResetResult({ username: result.username, password: result.new_password });
    } catch (e: any) {
      showToast(formatApiError(e?.response?.data), 'error');
    }
  }

  async function handleBulkUpload() {
    if (!csvFile) return;
    setIsUploading(true);
    setBulkResult(null);
    try {
      const result = await bulkUploadUsers(csvFile);
      setBulkResult(result);
      showToast(`Bulk upload complete: ${result.created_count} created, ${result.error_count} errors.`, 'success');
      await load();
    } catch (e: any) {
      showToast(formatApiError(e?.response?.data), 'error');
    } finally {
      setIsUploading(false);
    }
  }

  const handleCancelUpload = () => {
    setCsvFile(null);
    setBulkResult(null);
    setShowBulkUpload(false);
  };

  if (isLoading) {
    return (
      <div style={{ padding: 32, color: '#C37800', fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>
        Loading user directory...
      </div>
    );
  }

  return (
    <div className="page-wrapper">
            <style>{`
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }
        .stat-card {
          background: #FFFFFF; border: 1px solid #D6BB83; border-radius: 16px;
          padding: 16px 20px; display: flex; align-items: center; gap: 16px;
          box-shadow: 0 4px 12px rgba(128, 64, 34, 0.04);
        }
        .stat-icon {
          width: 44px; height: 44px; border-radius: 12px;
          background: #FCECD6; color: #5C2C16;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .stat-value { font-size: 22px; font-weight: 800; color: #5C2C16; line-height: 1.1; }
        .stat-label { font-size: 13px; color: #804022; font-weight: 600; margin-top: 2px; }

        .toolbar-container {
          display: flex; justify-content: space-between; align-items: center;
          gap: 12px; margin-bottom: 20px; flex-wrap: wrap;
        }
        .toolbar-left { display: flex; align-items: center; gap: 10px; flex: 1; flex-wrap: wrap; }
        .pill-search { position: relative; min-width: 260px; flex: 1; max-width: 360px; }
        .pill-search input {
          width: 100%; background: #FFFFFF; border: 1px solid #D6BB83;
          padding: 10px 16px 10px 40px; border-radius: 9999px;
          font-size: 14px; color: #804022; outline: none;
        }
        .pill-search .search-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: #C37800; }
        .pill-select {
          background: #FFFFFF; border: 1px solid #D6BB83;
          padding: 10px 16px; border-radius: 9999px; font-size: 14px;
          color: #804022; outline: none; font-weight: 600; cursor: pointer;
        }

        .bulk-card { background: #FCECD6; border: 1px solid #FCC896; border-radius: 16px; padding: 18px 24px; margin-bottom: 20px; }

        .table-card {
          background: #FFFFFF; border-radius: 16px; border: 1px solid #D6BB83;
          box-shadow: 0 4px 20px rgba(128, 64, 34, 0.05); overflow: hidden;
        }
        .table-responsive { width: 100%; overflow-x: auto; }
        table { width: 100%; border-collapse: collapse; text-align: left; }
        thead tr { background-color: #5C2C16; color: #FFFFFF; }
        th { padding: 14px 16px; font-size: 13px; font-weight: 700; letter-spacing: 0.3px; border-bottom: 2px solid #3D1C0E; white-space: nowrap; }
        tbody tr { border-bottom: 1px solid #F3EFD4; transition: background 0.15s; }
        tbody tr:hover { background-color: #FCF8F2; }
        tbody tr.selected-row { background-color: #FCECD6; }
        td { padding: 12px 16px; font-size: 14px; vertical-align: middle; color: #5C2C16; }

        .user-cell { display: flex; align-items: center; gap: 12px; }
        .avatar-circle {
          width: 36px; height: 36px; border-radius: 50%;
          background: #FCECD6; border: 1px solid #D6BB83; color: #804022;
          display: flex; align-items: center; justify-content: center;
          font-weight: 700; font-size: 13px; overflow: hidden; flex-shrink: 0;
        }
        .avatar-circle img { width: 100%; height: 100%; object-fit: cover; }

        .status-pill-badge { display: inline-block; padding: 4px 14px; border-radius: 9999px; font-size: 12px; font-weight: 700; text-align: center; color: #FFFFFF; }
        .status-pill-badge.active { background-color: #22C55E; }
        .status-pill-badge.inactive { background-color: #6B7280; }

        .action-icon-btn {
          background: transparent; border: none; color: #804022; padding: 6px;
          border-radius: 6px; cursor: pointer; display: inline-flex;
          align-items: center; justify-content: center; transition: all 0.15s;
        }
        .action-icon-btn:hover { background: #FCECD6; color: #C37800; }
        .action-icon-btn.danger:hover { background: rgba(223, 27, 57, 0.1); color: #DF1B39; }

        .custom-checkbox { width: 16px; height: 16px; accent-color: #5C2C16; cursor: pointer; }

        .table-footer {
          display: flex; justify-content: space-between; align-items: center;
          padding: 14px 20px; background: #FFFFFF; border-top: 1px solid #F3EFD4;
          font-size: 13px; color: #804022; flex-wrap: wrap; gap: 12px;
        }
        .pagination-controls { display: flex; align-items: center; gap: 6px; }
        .page-btn {
          width: 32px; height: 32px; border-radius: 8px; border: 1px solid #D6BB83;
          background: #FFFFFF; color: #804022; display: flex;
          align-items: center; justify-content: center; font-weight: 600;
          cursor: pointer; transition: all 0.15s;
        }
        .page-btn:hover:not(:disabled) { background: #FCECD6; }
        .page-btn.active { background: #5C2C16; color: #FFFFFF; border-color: #5C2C16; }
        .page-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        .modal-overlay {
          position: fixed; inset: 0; background: rgba(40, 20, 10, 0.5); backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center; z-index: 200; padding: 16px;
        }
        .modal-card {
          background: #FFFFFF; border-radius: 20px; padding: 28px; width: 100%; max-width: 420px;
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15); border: 1px solid #D6BB83;
          display: flex; flex-direction: column; gap: 16px;
        }
        .modal-input {
          width: 100%; background: #F8EFE6; border: 1px solid #D6BB83;
          padding: 12px 16px; border-radius: 12px; font-size: 14px; color: #804022; outline: none;
        }
        .credential-box {
          font-family: monospace; font-size: 20px; font-weight: 700;
          background: #F8EFE6; border: 1px dashed #C37800; padding: 14px;
          border-radius: 12px; text-align: center; color: #804022;
        }

        @media (max-width: 768px) {
          .toolbar-container { flex-direction: column; align-items: stretch; }
          .pill-search { max-width: 100%; }
        }
      `}</style>

      {/* --- TOP HEADER NAVIGATION --- */}
      <div className="header-nav">
        <button className="back-btn" onClick={() => navigate('/dashboard')}>
          <ArrowLeft size={16} />
          <span>Go Back to Dashboard</span>
        </button>

        <button className="signout-btn" onClick={signOut}>
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>

      {/* --- PAGE TITLE & SUBTITLE --- */}
      <div className="page-title-area">
        <h1>User Management</h1>
        <p>Manage all users in one place. Control access, assign roles, and monitor activity across your platform.</p>
      </div>

      {/* --- SUMMARY ROLE COUNTS --- */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <Users size={22} />
          </div>
          <div>
            <div className="stat-value">{totalUsersCount}</div>
            <div className="stat-label">Total Users</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <GraduationCap size={22} />
          </div>
          <div>
            <div className="stat-value">{studentCount}</div>
            <div className="stat-label">Students</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <School size={22} />
          </div>
          <div>
            <div className="stat-value">{teacherCount}</div>
            <div className="stat-label">Teachers</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <Shield size={22} />
          </div>
          <div>
            <div className="stat-value">{adminCount}</div>
            <div className="stat-label">Admins</div>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ background: '#EC7D76', color: '#fff', padding: 14, borderRadius: 12, marginBottom: 20, fontSize: 14 }}>
          {error}
        </div>
      )}

      {/* --- TOOLBAR / FILTERS --- */}
      <div className="toolbar-container">
        <div className="toolbar-left">
          {/* Search Input */}
          <div className="pill-search">
            <Search className="search-icon" size={16} />
            <input
              type="text"
              placeholder="Search..."
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          {/* Role Dropdown */}
          <select
            className="pill-select"
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value as any);
              setCurrentPage(1);
            }}
          >
            <option value="all">Role: All</option>
            <option value="student">Student</option>
            <option value="teacher">Teacher</option>
            <option value="admin">Admin</option>
          </select>

          {/* Status Dropdown */}
          <select
            className="pill-select"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as any);
              setCurrentPage(1);
            }}
          >
            <option value="all">Status: All</option>
            <option value="active">Active</option>
            <option value="inactive">Deactivated</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="action-btn-secondary" onClick={() => setShowBulkUpload(!showBulkUpload)}>
            <FileSpreadsheet size={16} />
            <span>CSV Import</span>
          </button>

          <button className="action-btn-primary" onClick={() => setShowCreateModal(true)}>
            <UserPlus size={16} />
            <span>+ Add User</span>
          </button>
        </div>
      </div>

      {/* --- CSV BULK UPLOAD PANEL --- */}
      {showBulkUpload && (
        <div className="bulk-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontWeight: 800, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileSpreadsheet size={18} /> Bulk Import Users via CSV
            </div>
            <button
              className="action-icon-btn"
              onClick={handleCancelUpload}
              title="Close Panel"
            >
              <X size={18} />
            </button>
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="file"
              accept=".csv"
              style={{ fontSize: 13 }}
              onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
            />
            <button
              className="action-btn-primary"
              style={{ padding: '8px 16px', fontSize: 13 }}
              onClick={handleBulkUpload}
              disabled={!csvFile || isUploading}
            >
              <Upload size={14} />
              {isUploading ? 'Uploading...' : 'Upload File'}
            </button>

            <button
              className="action-btn-secondary"
              style={{ padding: '8px 16px', fontSize: 13 }}
              onClick={handleCancelUpload}
              disabled={isUploading}
            >
              Cancel Upload
            </button>
          </div>

          {bulkResult && (
            <div style={{ marginTop: 12, fontSize: 13, borderTop: '1px solid #FCC896', paddingTop: 8 }}>
              <div>✅ {bulkResult.created_count} created | ❌ {bulkResult.error_count} errors</div>
              {bulkResult.errors.length > 0 && (
                <details style={{ marginTop: 6 }}>
                  <summary style={{ cursor: 'pointer', color: '#DF1B39' }}>View errors</summary>
                  <ul>
                    {bulkResult.errors.map((err, idx) => (
                      <li key={idx}>
                        Row {err.row} ({err.username || 'no username'}): {JSON.stringify(err.errors)}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}
        </div>
      )}

      {/* --- MAIN DATA TABLE --- */}
      <div className="table-card">
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th style={{ width: 40, textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    className="custom-checkbox"
                    checked={isAllSelected}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th>Full Name</th>
                <th>Email</th>
                <th>Username</th>
                <th>Status</th>
                <th>Role</th>
                <th>Joined Date</th>
                <th style={{ textAlign: 'right', paddingRight: 24 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: 40, color: '#C37800' }}>
                    No users found matching your filters.
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((u) => {
                  const fullName = u.profile
                    ? `${u.profile.first_name} ${u.profile.last_name}`.trim() || u.username
                    : u.username;
                  const email = u.profile?.email || `${u.username}@example.com`;
                  const isSelected = selectedIds.includes(u.id);

                  // Extract Initials for Avatar Fallback
                  const initials = fullName
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .substring(0, 2)
                    .toUpperCase();

                  return (
                    <tr key={u.id} className={isSelected ? 'selected-row' : ''}>
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          className="custom-checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectRow(u.id)}
                        />
                      </td>

                      {/* Full Name & Avatar */}
                      <td>
                        <div className="user-cell">
                          <div className="avatar-circle">
                            {u.profile?.profile_picture ? (
                              <img src={u.profile.profile_picture} alt={fullName} />
                            ) : (
                              <span>{initials}</span>
                            )}
                          </div>
                          <span style={{ fontWeight: 600 }}>{fullName}</span>
                        </div>
                      </td>

                      {/* Email */}
                      <td style={{ color: '#804022' }}>{email}</td>

                      {/* Username */}
                      <td style={{ color: '#804022', fontWeight: 500 }}>{u.username}</td>

                      {/* Status */}
                      <td>
                        <span className={`status-pill-badge ${u.is_active ? 'active' : 'inactive'}`}>
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      {/* Role */}
                      <td style={{ textTransform: 'capitalize', fontWeight: 600 }}>{u.role}</td>

                      {/* Joined Date */}
                      <td style={{ color: '#804022', fontSize: 13 }}>
                        {new Date(u.date_joined).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'right', paddingRight: 16 }}>
                        <div style={{ display: 'inline-flex', gap: 4 }}>
                          <button
                            className="action-icon-btn"
                            title="Edit User"
                            onClick={() => setEditingUser(u)}
                          >
                            <Edit3 size={16} />
                          </button>
                          <button
                            className="action-icon-btn"
                            title="Reset Password"
                            onClick={() => handleResetPassword(u)}
                          >
                            <Key size={16} />
                          </button>
                          <button
                            className="action-icon-btn danger"
                            title={u.is_active ? 'Deactivate User' : 'Reactivate User'}
                            onClick={() => handleToggleActive(u)}
                          >
                            {u.is_active ? <UserX size={16} /> : <UserCheck size={16} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* --- TABLE FOOTER / PAGINATION --- */}
        <div className="table-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>Rows per page</span>
            <select
              className="pill-select"
              style={{ padding: '4px 8px', fontSize: 12 }}
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <span style={{ color: '#804022', marginLeft: 8 }}>
              of {totalRows} rows
            </span>
          </div>

          <div className="pagination-controls">
            <button
              className="page-btn"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(1)}
              title="First Page"
            >
              <ChevronsLeft size={16} />
            </button>
            <button
              className="page-btn"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((prev) => prev - 1)}
              title="Previous Page"
            >
              <ChevronLeft size={16} />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((page) => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
              .map((page, idx, arr) => {
                const prevPage = arr[idx - 1];
                const showEllipsis = prevPage && page - prevPage > 1;

                return (
                  <React.Fragment key={page}>
                    {showEllipsis && <span style={{ padding: '0 4px', color: '#804022' }}>...</span>}
                    <button
                      className={`page-btn ${currentPage === page ? 'active' : ''}`}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </button>
                  </React.Fragment>
                );
              })}

            <button
              className="page-btn"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((prev) => prev + 1)}
              title="Next Page"
            >
              <ChevronRight size={16} />
            </button>
            <button
              className="page-btn"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(totalPages)}
              title="Last Page"
            >
              <ChevronsRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* --- CREATE USER MODAL --- */}
      {showCreateModal && (
        <CreateUserModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            load();
          }}
        />
      )}

      {/* --- EDIT USER MODAL --- */}
      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSaved={() => {
            setEditingUser(null);
            load();
          }}
        />
      )}

      {/* --- PASSWORD RESET MODAL --- */}
      {resetResult && (
        <div className="modal-overlay" onClick={() => setResetResult(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="modal-title" style={{ margin: 0, fontSize: 18, color: '#804022' }}>
                Password Reset
              </h3>
              <X size={20} style={{ cursor: 'pointer' }} onClick={() => setResetResult(null)} />
            </div>

            <p style={{ margin: 0, fontSize: 14, color: '#804022' }}>
              New password for <strong>{resetResult.username}</strong>:
            </p>

            <div className="credential-box">{resetResult.password}</div>

            <p style={{ margin: 0, color: '#DF1B39', fontSize: 12, fontWeight: 600 }}>
              ⚠️ Copy this now — it will not be displayed again.
            </p>

            <button className="action-btn-primary" onClick={() => setResetResult(null)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* --- MODAL COMPONENTS --- */
function CreateUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await createUser({ username, password, role });
      onCreated();
    } catch (e: any) {
      setError(formatApiError(e?.response?.data));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <form className="modal-card" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="modal-title" style={{ margin: 0, fontSize: 18, color: '#804022' }}>
            Create New User
          </h3>
          <X size={20} style={{ cursor: 'pointer' }} onClick={onClose} />
        </div>

        <input
          className="modal-input"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <input
          className="modal-input"
          placeholder="Password (min 8 characters)"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />
        <select className="modal-input" value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
          <option value="student">Student</option>
          <option value="teacher">Teacher</option>
          <option value="admin">Admin</option>
        </select>

        {error && <p style={{ color: '#DF1B39', fontSize: 13, margin: 0, whiteSpace: 'pre-line' }}>{error}</p>}

        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button type="submit" className="action-btn-primary" style={{ flex: 1, justifyContent: 'center' }} disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create'}
          </button>
          <button type="button" className="action-btn-secondary" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

function EditUserModal({
  user,
  onClose,
  onSaved,
}: {
  user: ManagedUser;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [username, setUsername] = useState(user.username);
  const [role, setRole] = useState<UserRole>(user.role);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await updateUser(user.id, { username, role });
      onSaved();
    } catch (e: any) {
      setError(formatApiError(e?.response?.data));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <form className="modal-card" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="modal-title" style={{ margin: 0, fontSize: 18, color: '#804022' }}>
            Edit User Details
          </h3>
          <X size={20} style={{ cursor: 'pointer' }} onClick={onClose} />
        </div>

        <input
          className="modal-input"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <select className="modal-input" value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
          <option value="student">Student</option>
          <option value="teacher">Teacher</option>
          <option value="admin">Admin</option>
        </select>

        {error && <p style={{ color: '#DF1B39', fontSize: 13, margin: 0, whiteSpace: 'pre-line' }}>{error}</p>}

        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button type="submit" className="action-btn-primary" style={{ flex: 1, justifyContent: 'center' }} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save'}
          </button>
          <button type="button" className="action-btn-secondary" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}