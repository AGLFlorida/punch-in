'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { CompanyModel } from 'src/main/services/company';
import { ProjectModel } from 'src/main/services/project';
import { NotifyBox } from '@/components/Notify';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { TrashIcon } from '@/components/CustomImage';
import { useNavigationGuard } from '@/components/NavigationGuard';

type SavedSnapshot = {
  companies: CompanyModel[];
  projects: ProjectModel[];
};

export default function ConfigurePage() {
  const router = useRouter();
  const { registerGuard, unregisterGuard } = useNavigationGuard();
  const [companies, setCompanies] = useState<CompanyModel[]>([]);
  const [projects, setProjects] = useState<ProjectModel[]>([]);
  const [deletedCompanies, setDeletedCompanies] = useState<CompanyModel[]>([]);
  const [deletedProjects, setDeletedProjects] = useState<ProjectModel[]>([]);
  const [didSave, setDidSave] = useState<boolean>(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const savedSnapshotRef = useRef<SavedSnapshot | null>(null);
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

  // Compare company models
  const companyEqual = (a: CompanyModel, b: CompanyModel): boolean => {
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
  useEffect(() => {
    const guard = async (href?: string): Promise<boolean> => {
      if (!hasUnsavedChanges) {
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
  }, [hasUnsavedChanges, registerGuard, unregisterGuard]);

  useEffect(() => {
    loadSelectables();
  }, []);

  const addCompany = () => {
    setCompanies((prev) => [...prev, { name: ''}]);
  }
  
  const updateCompany = (i: number, v: string) => {
    setCompanies((prev) => prev.map((c, idx) => (idx === i ? {name: v} : c)));
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
    setDeletedCompanies((prev) => [...prev, companies[i]]);
    setCompanies((prev) => prev.filter((_, idx) => idx !== i));
  }

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
  const loadSelectables = async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cos = (typeof window !== 'undefined' && (window as any).tp && (window as any).tp.getCompanyList) ? await (window as any).tp.getCompanyList() : [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const projs = (typeof window !== 'undefined' && (window as any).tp && (window as any).tp.getProjectList) ? await (window as any).tp.getProjectList() : [];
      
      if (cos.length > 0) setCompanies(cos);
      if (projs.length > 0) setProjects(projs);

      // Store snapshot after initial load so unchanged data isn't considered "unsaved"
      if (!savedSnapshotRef.current) {
        savedSnapshotRef.current = {
          companies: JSON.parse(JSON.stringify(cos)),
          projects: JSON.parse(JSON.stringify(projs)),
        };
      }
  }

  const onSave = async () => {
    try {
      if (deletedCompanies.length > 0) {
        for (const i in deletedCompanies) {
          if (deletedCompanies[i].id) await window.tp.removeCompany(deletedCompanies[i].id);
        }
        setDeletedCompanies([]); // need to reset state after mutation.
      }

      const filteredCompanies = companies.filter((c: CompanyModel) => c.name.trim() != "")
      await window.tp.setCompanyList(filteredCompanies);

      if (deletedProjects.length > 0) {
        for (const i in deletedProjects) {
          if (deletedProjects[i].id) await window.tp.removeProject(deletedProjects[i].id);
        }
        setDeletedProjects([]); // need to reset state after mutation.
      }

      const filteredProjects = projects.filter((p: ProjectModel) => p.company_id != -1)
      await window.tp.setProjectList(filteredProjects);

      await loadSelectables();

      // Store snapshot after successful save
      savedSnapshotRef.current = {
        companies: JSON.parse(JSON.stringify(companies)),
        projects: JSON.parse(JSON.stringify(projects)),
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

  return (
    <>
      {didSave && (
        <NotifyBox
          opts={{ title: "Save Successful" }}
          close={() => setDidSave(false)}
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
        <button onClick={onSave}>Save</button>
      </div>

      <div className="content" style={{ display: 'grid', gap: 24 }}>
        {/* Companies */}
        <section>
          <h2 style={{ margin: '0 0 8px 0' }}>Companies</h2>
          <div style={{ display: 'grid', gap: 8 }}>
            {companies.map((c, i) => (
              <div key={`co-${i}`} className="row" style={{ alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder={`Company ${i + 1}`}
                  value={c.name}
                  onChange={(e) => updateCompany(i, e.target.value)}
                  style={{ flex: 2, minWidth: 200 }}
                  disabled={(c.id !== undefined && c.id > 0)}
                />
                <button onClick={() => handleDeleteCompanyClick(i)} disabled={companies.length <= 1} aria-label="Remove company" title="Remove company" style={{ padding: 8 }}>
                  <TrashIcon />
                </button>
              </div>
            ))}
            <button onClick={addCompany}>+ Add company</button>
          </div>
        </section>

        {/* Projects */}
        <section>
          <h2 style={{ margin: '0 0 8px 0' }}>Projects</h2>
          <div style={{ display: 'grid', gap: 8 }}>
            {projects.map((p, i) => (
              <div key={`proj-${i}`} className="row" style={{ alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder={`Project ${i + 1}`}
                  value={p.name}
                  onChange={(e) => updateProjectName(i, e.target.value)}
                  style={{ flex: 2, minWidth: 200 }}
                  disabled={(p.id !== undefined && p.id > 0)}
                />
                <select
                  value={p.company_id ?? -1}
                  onChange={(e) => updateProjectCompany(i, Number(e.target.value))}
                  style={{ flex: 1, minWidth: 160 }}
                >
                  <option key={-1} value={-1}>{'Select a company'}</option>
                  {(companies.length ? companies : []).map((co) => ( (co.id && co.id >= 0) &&
                    <option key={co.id} value={co.id}>
                      {co.name || ''}
                    </option>
                  ))}
                </select>
                <button onClick={() => handleDeleteProjectClick(i)} aria-label="Remove project" title="Remove project" style={{ padding: 8 }}>
                  <TrashIcon />
                </button>
              </div>
            ))}
            <button onClick={addProject}>+ Add project</button>
          </div>
        </section>
      </div>
    </>
  );
}
