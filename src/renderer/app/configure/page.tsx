'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { CompanyModel } from '../../../main/services/company';
import type { ProjectModel } from '../../../main/services/project';
import { NotifyBox } from '@/components/Notify';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { TrashIcon } from '@/components/CustomImage';
import { useNavigationGuard } from '@/components/NavigationGuard';
import { LS_POMODORO_MODE } from '@/lib/constants';

/** UI-only extension: _tempId gives unsaved companies a stable React key. */
type UICompanyModel = CompanyModel & { _tempId?: number };

type SavedSnapshot = {
  companies: UICompanyModel[];
  projects: ProjectModel[];
};

export default function ConfigurePage() {
  const router = useRouter();
  const { registerGuard, unregisterGuard } = useNavigationGuard();
  const tempIdCounter = useRef(0);
  const [companies, setCompanies] = useState<UICompanyModel[]>([]);
  const [projects, setProjects] = useState<ProjectModel[]>([]);
  const [deletedCompanies, setDeletedCompanies] = useState<UICompanyModel[]>([]);
  const [deletedProjects, setDeletedProjects] = useState<ProjectModel[]>([]);
  const [didSave, setDidSave] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const savedSnapshotRef = useRef<SavedSnapshot | null>(null);
  const [pomodoroEnabled, setPomodoroEnabled] = useState<boolean>(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    type: 'company' | 'project' | null;
    index: number | null;
    name: string;
  }>({
    isOpen: false,
    type: null,
    index: null,
    name: '',
  });
  const [unsavedChangesDialog, setUnsavedChangesDialog] = useState<{
    isOpen: boolean;
    pendingNavigation: string | null;
  }>({
    isOpen: false,
    pendingNavigation: null,
  });

  // Helper function to deep compare arrays
  const arraysEqual = <T,>(a: T[], b: T[], compareFn: (a: T, b: T) => boolean): boolean => {
    if (a.length !== b.length) return false;
    return a.every((item, index) => compareFn(item, b[index]));
  };

  // Compare company models for unsaved-changes detection.
  // _tempId is a UI-only React key, not part of logical identity — exclude it.
  const companyEqual = (a: UICompanyModel, b: UICompanyModel): boolean => {
    return a.id === b.id && a.name === b.name;
  };

  // Compare project models
  const projectEqual = (a: ProjectModel, b: ProjectModel): boolean => {
    return a.id === b.id && a.name === b.name && a.company_id === b.company_id;
  };

  // Check if there are unsaved changes
  const hasChanges = (): boolean => {
    const snapshot = savedSnapshotRef.current;
    if (!snapshot) {
      // No snapshot means data hasn't loaded yet, no changes
      return false;
    }

    // Check if deleted arrays have items
    if (deletedCompanies.length > 0 || deletedProjects.length > 0) {
      return true;
    }

    // Compare companies
    if (!arraysEqual(companies, snapshot.companies, companyEqual)) {
      return true;
    }

    // Compare projects
    if (!arraysEqual(projects, snapshot.projects, projectEqual)) {
      return true;
    }

    return false;
  };

  // Update hasUnsavedChanges when state changes
  useEffect(() => {
    const hasChangesFlag = hasChanges();
    setHasUnsavedChanges(hasChangesFlag);
  }, [companies, projects, deletedCompanies, deletedProjects]);

  // Register navigation guard
  // Use a ref to always get the latest hasUnsavedChanges value
  const hasUnsavedChangesRef = useRef(hasUnsavedChanges);
  useEffect(() => {
    hasUnsavedChangesRef.current = hasUnsavedChanges;
  }, [hasUnsavedChanges]);

  useEffect(() => {
    const guard = async (href?: string): Promise<boolean> => {
      // Always check the current value from ref, not the closure value
      if (!hasUnsavedChangesRef.current) {
        return true; // Allow navigation
      }

      // Block navigation and show dialog with pending navigation path
      if (href) {
        setUnsavedChangesDialog({
          isOpen: true,
          pendingNavigation: href,
        });
      }
      return false; // Block navigation
    };

    registerGuard(guard);

    return () => {
      unregisterGuard();
    };
  }, [registerGuard, unregisterGuard]);

  useEffect(() => {
    loadSelectables();
  }, []);

  // Load pomodoro mode from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem(LS_POMODORO_MODE);
    setPomodoroEnabled(stored === 'true');
  }, []);

  const handlePomodoroToggle = (enabled: boolean) => {
    setPomodoroEnabled(enabled);
    if (typeof window !== 'undefined') {
      localStorage.setItem(LS_POMODORO_MODE, String(enabled));
    }
  };

  const addCompany = () => {
    const tempId = ++tempIdCounter.current;
    setCompanies((prev) => [...prev, { name: '', _tempId: tempId }]);
  }

  const updateCompany = (i: number, v: string) => {
    // Spread existing fields to preserve _tempId so the React key remains stable.
    setCompanies((prev) => prev.map((c, idx) => (idx === i ? { ...c, name: v } : c)));
  }

  const handleDeleteCompanyClick = (i: number) => {
    const company = companies[i];
    setConfirmDialog({
      isOpen: true,
      type: 'company',
      index: i,
      name: company.name || `Company ${i + 1}`,
    });
  };

  const removeCompany = (i: number) => {
    const removed = companies[i];
    setDeletedCompanies((prev) => [...prev, removed]);
    setCompanies((prev) => prev.filter((_, idx) => idx !== i));
    // Reassign any projects owned by this company to unassigned (-1)
    // so they remain visible and manageable in the UI.
    if (removed.id && removed.id > 0) {
      setProjects((prev) =>
        prev.map((p) => p.company_id === removed.id ? { ...p, company_id: -1 } : p)
      );
    }
  }

  /**
   * Add a new project pre-assigned to a company.
   * If the company has no saved id yet, the project defaults to company_id -1
   * and the user will need to select the company manually.
   */
  const addProjectForCompany = (companyId: number | undefined) => {
    setProjects((prev) => [...prev, { name: '', company_id: companyId && companyId > 0 ? companyId : -1 }]);
  };

  const addProject = () =>
    setProjects((prev) => [...prev, { name: '', company_id: -1 }]);

  const updateProjectName = (i: number, v: string) =>
    setProjects((prev) => prev.map((p, idx) => (idx === i ? { ...p, name: v } : p)));

  const updateProjectCompany = (i: number, v: number) => {
    return setProjects((prev) => prev.map((p, idx) => (idx === i ? {
       ...p,
       company_id: v
      } : p)));
    }

  const handleDeleteProjectClick = (i: number) => {
    const project = projects[i];
    setConfirmDialog({
      isOpen: true,
      type: 'project',
      index: i,
      name: project.name || `Project ${i + 1}`,
    });
  };

  const removeProject = (i: number) => {
    setDeletedProjects((prev) => [...prev, projects[i]]);
    setProjects((prev) => prev.filter((_, idx) => idx !== i));
  }

  const handleConfirmDelete = () => {
    if (confirmDialog.type === 'company' && confirmDialog.index !== null) {
      removeCompany(confirmDialog.index);
    } else if (confirmDialog.type === 'project' && confirmDialog.index !== null) {
      removeProject(confirmDialog.index);
    }
    setConfirmDialog({ isOpen: false, type: null, index: null, name: '' });
  };

  const handleCancelDelete = () => {
    setConfirmDialog({ isOpen: false, type: null, index: null, name: '' });
  };

  // (Re)load companies and projects from DB to update UI
  const loadSelectables = async (): Promise<{ companies: CompanyModel[]; projects: ProjectModel[] }> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cos = (typeof window !== 'undefined' && (window as any).tp && (window as any).tp.getCompanyList) ? await (window as any).tp.getCompanyList() : [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const projs = (typeof window !== 'undefined' && (window as any).tp && (window as any).tp.getProjectList) ? await (window as any).tp.getProjectList() : [];

      setCompanies(cos);
      setProjects(projs);

      // Store snapshot after initial load so unchanged data isn't considered "unsaved"
      if (!savedSnapshotRef.current) {
        savedSnapshotRef.current = {
          companies: JSON.parse(JSON.stringify(cos)),
          projects: JSON.parse(JSON.stringify(projs)),
        };
      }

      return { companies: cos, projects: projs };
  }

  const onSave = async () => {
    // Block save when unassigned projects exist to prevent silent data loss.
    const unassigned = projects.filter((p) => !p.company_id || p.company_id < 1);
    if (unassigned.length > 0) {
      setSaveError(`${unassigned.length} project${unassigned.length > 1 ? 's have' : ' has'} no company assigned. Assign a company or delete before saving.`);
      return;
    }
    try {
      if (deletedCompanies.length > 0) {
        for (const i in deletedCompanies) {
          if (deletedCompanies[i].id) await window.tp.removeCompany(deletedCompanies[i].id);
        }
        setDeletedCompanies([]); // need to reset state after mutation.
      }

      const filteredCompanies = companies.filter((c: UICompanyModel) => c.name.trim() !== '')
      await window.tp.setCompanyList(filteredCompanies);

      if (deletedProjects.length > 0) {
        for (const i in deletedProjects) {
          if (deletedProjects[i].id) await window.tp.removeProject(deletedProjects[i].id);
        }
        setDeletedProjects([]); // need to reset state after mutation.
      }

      const filteredProjects = projects.filter((p: ProjectModel) => p.company_id && p.company_id > 0)
      await window.tp.setProjectList(filteredProjects);

      // Load fresh data from DB and use it to update snapshot
      // This ensures the snapshot matches what's actually in the DB after save
      const loaded = await loadSelectables();
      savedSnapshotRef.current = {
        companies: JSON.parse(JSON.stringify(loaded.companies)),
        projects: JSON.parse(JSON.stringify(loaded.projects)),
      };
      setHasUnsavedChanges(false);
      setDidSave(true);
    } catch (e) {
      console.error(e);
    }
  };

  const handleConfirmUnsavedNavigation = () => {
    const href = unsavedChangesDialog.pendingNavigation;
    if (href) {
      // Clear unsaved changes flag and snapshot
      setHasUnsavedChanges(false);
      savedSnapshotRef.current = null;
      // Navigate to the intended destination
      router.push(href);
    }
    setUnsavedChangesDialog({ isOpen: false, pendingNavigation: null });
  };

  const handleCancelUnsavedNavigation = () => {
    // Keep unsaved changes flag, just close dialog
    setUnsavedChangesDialog({ isOpen: false, pendingNavigation: null });
  };

  // Map company_id -> array of project indices for grouped display
  const projectsByCompanyId = useMemo(() => {
    const map = new Map<number, number[]>();
    projects.forEach((p, idx) => {
      const cid = p.company_id && p.company_id > 0 ? p.company_id : -1;
      if (!map.has(cid)) map.set(cid, []);
      map.get(cid)!.push(idx);
    });
    return map;
  }, [projects]);

  // Projects with no valid company assignment
  const unassignedProjectIndices = projectsByCompanyId.get(-1) ?? [];

  return (
    <>
      {didSave && (
        <NotifyBox
          opts={{ title: 'Save Successful' }}
          close={() => setDidSave(false)}
        />
      )}
      {saveError && (
        <NotifyBox
          opts={{ title: 'Cannot Save', body: saveError }}
          close={() => setSaveError(null)}
        />
      )}
      <ConfirmDialog
        title={`Delete ${confirmDialog.type === 'company' ? 'Company' : 'Project'}`}
        message={`Are you sure you want to delete "${confirmDialog.name}"?`}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        isOpen={confirmDialog.isOpen}
      />
      <ConfirmDialog
        title="Unsaved Changes"
        message="You have unsaved changes. Are you sure you want to leave? Your changes will be lost."
        onConfirm={handleConfirmUnsavedNavigation}
        onCancel={handleCancelUnsavedNavigation}
        isOpen={unsavedChangesDialog.isOpen}
        confirmLabel="OK"
        cancelLabel="Cancel"
        confirmButtonStyle={{ background: '#2563eb' }}
      />

      <div className="header">
        <h1 className="title">Configure</h1>
        <button onClick={onSave} disabled={!hasUnsavedChanges} style={{ background: hasUnsavedChanges ? '#111827' : undefined, color: hasUnsavedChanges ? '#fff' : undefined, borderColor: hasUnsavedChanges ? '#111827' : undefined }}>Save</button>
      </div>

      <div className="content" style={{ display: 'grid', gap: 16 }}>

        {/* Empty state: guide first-time users */}
        {companies.length === 0 && (
          <div data-testid="empty-company-state" style={{ padding: '32px 16px', textAlign: 'center', border: '2px dashed #e5e7eb', borderRadius: 12, color: '#6b7280' }}>
            <p style={{ margin: '0 0 4px 0', fontWeight: 600, fontSize: 15, color: '#1f2937' }}>No companies yet</p>
            <p style={{ margin: '0 0 16px 0', fontSize: 13 }}>Start by adding a company, then add projects to it.</p>
            <button onClick={addCompany} style={{ background: '#111827', color: '#fff', borderColor: '#111827' }}>+ Add company</button>
          </div>
        )}

        {/* Companies with nested projects */}
        {companies.map((c, ci) => {
          const childProjectIndices = c.id && c.id > 0 ? (projectsByCompanyId.get(c.id) ?? []) : [];
          const isNewCompany = !c.id || c.id <= 0;
          // Use saved id or stable tempId as React key to avoid DOM misassignment on delete.
          const companyKey = c.id && c.id > 0 ? `co-id-${c.id}` : `co-tmp-${c._tempId ?? ci}`;

          return (
            <div
              key={companyKey}
              style={{
                border: '1px solid #e5e7eb',
                borderRadius: 10,
                overflow: 'hidden',
              }}
            >
              {/* Company row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: '#f3f4f6', borderBottom: childProjectIndices.length > 0 || !isNewCompany ? '1px solid #e5e7eb' : undefined }}>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: '#6b7280', textTransform: 'uppercase', minWidth: 60 }}>Company</span>
                <input
                  type="text"
                  placeholder={`Company ${ci + 1}`}
                  value={c.name}
                  onChange={(e) => updateCompany(ci, e.target.value)}
                  style={{ flex: 1, minWidth: 160 }}
                  disabled={(c.id !== undefined && c.id > 0)}
                  aria-label={`Company ${ci + 1} name`}
                />
                <button
                  onClick={() => handleDeleteCompanyClick(ci)}
                  disabled={companies.length <= 1}
                  aria-label="Remove company"
                  title="Remove company"
                  style={{ padding: 8 }}
                >
                  <TrashIcon />
                </button>
              </div>

              {/* Projects nested under this company */}
              {childProjectIndices.map((pi) => {
                const p = projects[pi];
                return (
                  <div key={`proj-${pi}`} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px 8px 32px', borderBottom: '1px solid #f3f4f6', background: '#fff' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: '#9ca3af', textTransform: 'uppercase', minWidth: 60 }}>Project</span>
                    <input
                      type="text"
                      placeholder={`Project ${pi + 1}`}
                      value={p.name}
                      onChange={(e) => updateProjectName(pi, e.target.value)}
                      style={{ flex: 1, minWidth: 160 }}
                      disabled={(p.id !== undefined && p.id > 0)}
                      aria-label={`Project ${pi + 1} name`}
                    />
                    <button
                      onClick={() => handleDeleteProjectClick(pi)}
                      aria-label="Remove project"
                      title="Remove project"
                      style={{ padding: 8 }}
                    >
                      <TrashIcon />
                    </button>
                  </div>
                );
              })}

              {/* Add project within company (only for saved companies) */}
              <div style={{ padding: '8px 12px 8px 32px', background: '#fff' }}>
                {isNewCompany ? (
                  <span data-testid={`new-company-hint-${companyKey}`} style={{ fontSize: 12, color: '#9ca3af', fontStyle: 'italic' }}>Save to enable adding projects</span>
                ) : (
                  <button
                    onClick={() => addProjectForCompany(c.id)}
                    style={{ fontSize: 13, padding: '5px 10px' }}
                    aria-label={`Add project to ${c.name}`}
                  >
                    + Add project
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {/* Add company button (shown when companies already exist) */}
        {companies.length > 0 && (
          <div>
            <button onClick={addCompany}>+ Add company</button>
          </div>
        )}

        {/* Unassigned projects (company_id missing or -1) */}
        {unassignedProjectIndices.length > 0 && (
          <div style={{ border: '1px solid #fca5a5', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '8px 12px', background: '#fee2e2', borderBottom: '1px solid #fca5a5' }}>
              <span data-testid="unassigned-projects-heading" style={{ fontSize: 13, fontWeight: 600, color: '#991b1b' }}>Unassigned projects</span>
              <span style={{ fontSize: 12, color: '#b91c1c', marginLeft: 8 }}>Assign a company before saving</span>
            </div>
            {unassignedProjectIndices.map((pi) => {
              const p = projects[pi];
              return (
                <div key={`proj-unassigned-${pi}`} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderBottom: '1px solid #fecaca', background: '#fff' }}>
                  <input
                    type="text"
                    placeholder={`Project ${pi + 1}`}
                    value={p.name}
                    onChange={(e) => updateProjectName(pi, e.target.value)}
                    style={{ flex: 2, minWidth: 160 }}
                    disabled={(p.id !== undefined && p.id > 0)}
                    aria-label={`Unassigned project ${pi + 1} name`}
                  />
                  <select
                    value={p.company_id ?? -1}
                    onChange={(e) => updateProjectCompany(pi, Number(e.target.value))}
                    style={{ flex: 1, minWidth: 160 }}
                    aria-label={`Unassigned project ${pi + 1} company`}
                  >
                    <option value={-1}>Select a company</option>
                    {companies.map((co, ci) => co.id && co.id > 0 ? (
                      <option key={co.id} value={co.id}>
                        {co.name || ''}
                      </option>
                    ) : (
                      <option key={`new-co-${ci}`} value={-1} disabled>
                        {co.name ? `${co.name} (unsaved)` : `Company ${ci + 1} (unsaved)`}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => handleDeleteProjectClick(pi)}
                    aria-label="Remove project"
                    title="Remove project"
                    style={{ padding: 8 }}
                  >
                    <TrashIcon />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Fallback: add project manually (available whenever at least one saved company exists) */}
        {companies.some((c) => c.id && c.id > 0) && (
          <div>
            <button onClick={addProject}>+ Add unassigned project</button>
          </div>
        )}

        {/* Pomodoro mode */}
        <div
          data-testid="pomodoro-section"
          style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: '16px', marginTop: 8 }}
        >
          <div style={{ marginBottom: 6 }}>
            <span style={{ fontWeight: 600, fontSize: 15 }}>Behavior</span>
          </div>
          <label
            htmlFor="pomodoro-toggle"
            style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }}
          >
            <input
              id="pomodoro-toggle"
              data-testid="pomodoro-toggle"
              type="checkbox"
              checked={pomodoroEnabled}
              onChange={(e) => handlePomodoroToggle(e.target.checked)}
              style={{ width: 16, height: 16, cursor: 'pointer' }}
            />
            <span style={{ fontSize: 14 }}>
              <strong>Pomodoro mode</strong> — alert after 50&nbsp;min, resume after a 10-min break
            </span>
          </label>
        </div>
      </div>
    </>
  );
}
