'use client';

import Sidebar from '@/components/Sidebar';
import { useEffect, useState } from 'react';
import { CompanyModel } from 'src/main/services/company';
import { ProjectModel } from 'src/main/services/project';

export default function ConfigurePage() {
  const [companies, setCompanies] = useState<CompanyModel[]>([]);
  const [projects, setProjects] = useState<ProjectModel[]>([]);
  const [deletedCompanies, setDeletedCompanies] = useState<CompanyModel[]>([]);
  const [deletedProjects, setDeletedProjects] = useState<ProjectModel[]>([]);

  useEffect(() => {
    (async () => {
      await askPermissions();

      const cos = await window.tp.getCompanyList();
      const projs = await window.tp.getProjectList();

      if (cos.length > 0) setCompanies(cos);

      if (projs.length > 0) setProjects(projs);

    })();
  }, []);

  const addCompany = () => {
    setCompanies((prev) => [...prev, { name: ''}]);
  }
  
  const updateCompany = (i: number, v: string) => {
    setCompanies((prev) => prev.map((c, idx) => (idx === i ? {name: v} : c)));
  }

  const removeCompany = (i: number) => {
    setCompanies((prev) => prev.filter((_, idx) => idx !== i));
    const _delCo = deletedCompanies;
    _delCo.push(companies[i]);
    setDeletedCompanies(_delCo);
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
  
  const removeProject = (i: number) => {
    setProjects((prev) => prev.filter((_, idx) => idx !== i));
    const _delProj = deletedProjects;
    _delProj.push(projects[i])
    setDeletedProjects(_delProj);
  }

  const onSave = async () => {
    try {
      if (deletedCompanies.length > 0) {
        for (const i in deletedCompanies) {
          if (deletedCompanies[i].id) await window.tp.removeCompany(deletedCompanies[i].id);
        }
        setDeletedCompanies([]); // need to reset state after mutation.
      }

      //const c = companies.map(c => c);
      const filteredCompanies = companies.filter((c: CompanyModel) => c.name.trim() != "")
      await window.tp.setCompanyList(filteredCompanies);
      //setCompanies(companies); // need to reset state after mutation.

      // const p = projects.map(p => { return {
      //   name: p.name.trim(), company: p.company_id
      // }}).filter(Boolean);

      if (deletedProjects.length > 0) {
        for (const i in deletedProjects) {
          if (deletedProjects[i].id) await window.tp.removeProject(deletedProjects[i].id);
        }
        setDeletedProjects([]); // need to reset state after mutation.
      }

      const filteredProjects = projects.filter((p: ProjectModel) => p.company_id != -1)
      await window.tp.setProjectList(filteredProjects);
      await notify("Notification", "Save Successful.")
    } catch (e) {
      console.error(e);
    } 
  };

  return (
    <Sidebar>
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
                <button onClick={() => removeCompany(i)} disabled={companies.length <= 1}>
                  Remove
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
                  onChange={(e) => updateProjectCompany(i, Number(e.target.value))}
                  style={{ flex: 1, minWidth: 160 }}
                >
                  <option key={-1} value={-1}>{'Select a company'} </option>
                  {(companies.length ? companies : []).map((co) => (
                    <option key={co.id} value={co.id} selected={co.id == p.company_id}>
                      {co.name || ''}
                    </option>
                  ))}
                </select>
                <button onClick={() => removeProject(i)} disabled={projects.length <= 1}>
                  Remove
                </button>
              </div>
            ))}
            <button onClick={addProject}>+ Add project</button>
          </div>
        </section>
      </div>
    </Sidebar>
  );
}

async function askPermissions(): Promise<boolean> {
  // TODO: need to fix this. it's a little weird and the perm setting is buried as 'Electron' in system settings.
  let perm: NotificationPermission = Notification.permission;

  //console.log(`permissions: ${perm}`);

  if (perm !== 'granted') {
    perm = await Notification.requestPermission(); // <- use return value
  }

  return (perm === 'granted');
}
async function notify(title: string, body?: string) {
  const granted = await askPermissions();

  if (granted) {
    new Notification(title, { body });
  }
}