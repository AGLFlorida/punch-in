'use client';

import { useEffect, useState } from 'react';
import { CompanyModel } from 'src/main/services/company';
import { ProjectModel } from 'src/main/services/project';
import { NotifyBox } from '@/components/Notify';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { TrashIcon } from '@/components/CustomImage';

export default function ConfigurePage() {
  const [companies, setCompanies] = useState<CompanyModel[]>([]);
  const [projects, setProjects] = useState<ProjectModel[]>([]);
  const [deletedCompanies, setDeletedCompanies] = useState<CompanyModel[]>([]);
  const [deletedProjects, setDeletedProjects] = useState<ProjectModel[]>([]);
  const [didSave, setDidSave] = useState<boolean>(false);
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

      loadSelectables();

      setDidSave(true);
    } catch (e) {
      console.error(e);
    } 
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
