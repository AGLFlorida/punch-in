'use client';

import Sidebar from '@/components/Sidebar';
import { useEffect, useState } from 'react';
import { CompanyModel } from 'src/main/services/company';
import { ProjectModel } from 'src/main/services/project';

export default function ConfigurePage() {
  const [companies, setCompanies] = useState<CompanyModel[]>([]);
  const [projects, setProjects] = useState<ProjectModel[]>([{ name: '', company_id: -1 }]);
  const [deletedCompanies, setDeletedCompanies] = useState<CompanyModel[]>([]);

  // Initialize projects from existing state
  useEffect(() => {
    (async () => {
      const cos = await window.tp.getCompanyList();
      //const projs = await window.tp.getProjectList();
      //console.log("projects:", projs)

      const initCompanies = (cos ?? []).map((c: CompanyModel) => c);
      if (initCompanies.length > 0) {
        //console.log("init companies:", initCompanies.map((c: CompanyModel) => c.id));
        setCompanies(initCompanies);
      }

      // const initProjects = (s.projects ?? []).map((p: string) => ({ name: p, company: '' }));
      // if (initProjects.length > 0) setProjects(initProjects);

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

  // const addProject = () => 
  //   setProjects((prev) => [...prev, { name: '', company: companies[0] ?? '' }]);
  
  const updateProjectName = (i: number, v: string) =>
    setProjects((prev) => prev.map((p, idx) => (idx === i ? { ...p, name: v } : p)));
  
  const updateProjectCompany = (i: number, v: string) =>
    setProjects((prev) => prev.map((p, idx) => (idx === i ? { ...p, company: v } : p)));
  
  const removeProject = (i: number) => setProjects((prev) => prev.filter((_, idx) => idx !== i));

  const onSave = async () => {
    if (deletedCompanies.length > 0) {
      for (const i in deletedCompanies) {
        if (deletedCompanies[i].id) await window.tp.removeCompany(deletedCompanies[i].id);
      }
      setDeletedCompanies([]); // need to reset state after mutation.
    }

    const c = companies.map(c => c);
    await window.tp.setCompanyList(c);
    setCompanies(c); // need to reset state after mutation.

    // const p = projects.map(p => { return {
    //   name: p.name.trim(), company: p.company
    // }}).filter(Boolean);

    //await window.tp.setProjectList(p);

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
                />
                <select
                  // value={p.company}
                  onChange={(e) => updateProjectCompany(i, e.target.value)}
                  style={{ flex: 1, minWidth: 160 }}
                >
                  {(companies.length ? companies : []).map((co) => (
                    <option key={co.id} value={co.name}>
                      {co.name || ''}
                    </option>
                  ))}
                </select>
                <button onClick={() => removeProject(i)} disabled={projects.length <= 1}>
                  Remove
                </button>
              </div>
            ))}
            {/* <button onClick={addProject}>+ Add project</button> */}
          </div>
        </section>
      </div>
    </Sidebar>
  );
}
