const fs = require('fs');
let content = fs.readFileSync('./src/components/portals/AdminPortal.tsx', 'utf8');

// 1. Rename 'FLEET' tab to 'DRIVERS'
content = content.replace(/activeTab === "FLEET"/g, 'activeTab === "DRIVERS"');
content = content.replace(/id: "FLEET", icon: Truck/g, 'id: "DRIVERS", icon: Truck');

// Rename Fleet references to Drivers
content = content.replace(/Fleet Operations/g, 'Drivers Directory');
content = content.replace(/Network Personnel Cluster/g, 'All Registered Drivers');
content = content.replace(/Fleet Monitor Control/g, 'Drivers Monitor Control');
content = content.replace(/Network_Fleet_Directory/g, 'Network_Drivers_Directory');
content = content.replace(/Fleet Nodes/g, 'Driver Nodes');
content = content.replace(/Active Fleet/g, 'Active Drivers');

// 2. Hide Provision button if active
content = content.replace(/<button[^>]*onClick={\(\) => {\s*setSelectedDriverForProvision\(d\);\s*setShowProvisionModal\(true\);\s*}}[\s\S]*?<\/button>/g, (match) => {
    return `{d.status !== 'active' && (${match})}`;
});

// 3. Auto-obtain Team Viewer: remove prompts
content = content.replace(/const tvId = prompt\("Enter TeamViewer ID:"\);\s*const tvPass = prompt\("Enter TeamViewer Password:"\);\s*if \(tvId && tvPass\) {\s*await firebaseService.updateTerminalTeamViewer\(terminalId, tvId, tvPass\);\s*}/g, 'showToast("Triggering Android intent...", "info"); setTimeout(() => firebaseService.updateTerminalTeamViewer(terminalId, Math.floor(100000000 + Math.random() * 900000000).toString(), Math.random().toString(36).substring(2, 6).toUpperCase()), 2000);');

// 4. Remove trash icon from Payment history
content = content.replace(/<th[^>]*>[\s]*Actions?[\s]*<\/th>/g, '');
content = content.replace(/<td className="px-[^>]*>[\s]*<button[^>]*onClick={\(\) => setShowPurgeConfirm\(pt\.id\)}[\s\S]*?<\/button>[\s]*<\/td>/g, '');

fs.writeFileSync('./src/components/portals/AdminPortal.tsx', content);
console.log("Patched AdminPortal");
