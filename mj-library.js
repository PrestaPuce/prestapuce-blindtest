/* ============================================================================
 * mj-library.js — Menus Contextuels, Lightbox, Bibliothèques, Profil MJ & Équipes
 * Console MJ Pro - Buz'Ta Puce (v1.303)
 * ============================================================================ */

function openPlayerMenu(e, uid) {
    e.stopPropagation();
    const d = allPlayersData[uid];
    if(!d) return;
    const safeName = d.name ? d.name.replace(/'/g, "\\'") : "";
    const iB = currentBlocked[d.name];
    
    let html = "";
    if(d.banned) {
         html = `
            <div class="dropdown-item" onclick="closeGlobalDropdown(); openEditModal('${uid}')">✏️ Éditer le joueur</div>
            <div class="dropdown-item" onclick="closeGlobalDropdown(); unkickPlayer('${uid}')">▶️ Réactiver le joueur</div>
            <div class="dropdown-item" style="color:var(--danger);" onclick="closeGlobalDropdown(); deletePlayerDefinitive('${uid}', '${safeName}')">🗑️ Supprimer définitivement</div>
         `;
    } else if (d.active === false && d.recoveryRequest) {
        html = `
            <div class="dropdown-item" onclick="closeGlobalDropdown(); openEditModal('${uid}')">✏️ Éditer le joueur</div>
            <div class="dropdown-item" style="color:var(--success);" onclick="closeGlobalDropdown(); acceptRecovery('${uid}')">✅ Accepter la connexion</div>
            <div class="dropdown-item" style="color:var(--danger);" onclick="closeGlobalDropdown(); rejectRecovery('${uid}')">❌ Refuser</div>
        `;
    } else if (d.active === false) {
         html = `
            <div class="dropdown-item" onclick="closeGlobalDropdown(); openEditModal('${uid}')">✏️ Éditer le joueur</div>
            <div class="dropdown-item" onclick="closeGlobalDropdown(); restoreInactivePlayer('${uid}')">▶️ Réactiver le joueur</div>
            <div class="dropdown-item" style="color:var(--danger);" onclick="closeGlobalDropdown(); kickPlayer('${uid}', '${safeName}')">🟥 Expulser</div>
            <div class="dropdown-item" style="color:var(--danger);" onclick="closeGlobalDropdown(); deletePlayerDefinitive('${uid}', '${safeName}')">🗑️ Supprimer définitivement</div>
        `;
    } else {
        html = `
            <div class="dropdown-item" onclick="closeGlobalDropdown(); forceBuzzer('${uid}')">⚡ Forcer le buzzer</div>
            <div class="dropdown-item" onclick="closeGlobalDropdown(); toggleBlockPlayer('${safeName}')">${iB ? '🟢 Débloquer le buzzer' : '🛑 Bloquer le buzzer'}</div>
            <div class="dropdown-item" onclick="closeGlobalDropdown(); openEditModal('${uid}')">✏️ Éditer le joueur</div>
            <div class="dropdown-item" onclick="closeGlobalDropdown(); pausePlayer('${uid}', '${safeName}')">⏸️ Mettre en pause</div>
            ${d.hasBeenWarned===true ? `<div class="dropdown-item" style="color:var(--danger);" onclick="closeGlobalDropdown(); kickPlayer('${uid}', '${safeName}')">🟥 Expulser le joueur</div>` : `<div class="dropdown-item" style="color:var(--gold);" onclick="closeGlobalDropdown(); warnPlayer('${uid}', '${safeName}')">🟨 Avertir le joueur</div>`}
            <div class="dropdown-item" style="color:var(--danger);" onclick="closeGlobalDropdown(); deletePlayerDefinitive('${uid}', '${safeName}')">🗑️ Supprimer définitivement</div>
        `;
    }
    showGlobalMenu(e.currentTarget, html);
}

function openTeamMenu(e, teamName) {
    e.stopPropagation();
    const t = globalTeams[teamName];
    if(!t) return;
    const safeK = teamName.replace(/'/g, "\\'");
    const isA = t.active !== false;
    const isBan = t.banned === true;
    
    let members = [];
    Object.values(allPlayersData).forEach(p => {
        if (p.teamName === teamName && p.active !== false && !p.banned) members.push(p);
    });
    const isTeamMuted = members.length > 0 && members.some(m => currentBlocked[m.name]);

    let html = "";
    if(isBan) {
        html = `
            <div class="dropdown-item" onclick="closeGlobalDropdown(); openRestoreModal('${safeK}')">▶️ Réactiver l'équipe</div>
            <div class="dropdown-item" style="color:var(--danger);" onclick="closeGlobalDropdown(); deleteTeamDefinitive('${safeK}')">🗑️ Supprimer définitivement</div>
        `;
    } else if(!isA) {
        html = `
            <div class="dropdown-item" onclick="closeGlobalDropdown(); openTeamModal('${safeK}')">✏️ Éditer l'équipe</div>
            <div class="dropdown-item" onclick="closeGlobalDropdown(); openRestoreModal('${safeK}')">▶️ Réactiver l'équipe</div>
            <div class="dropdown-item" style="color:var(--danger);" onclick="closeGlobalDropdown(); kickTeam('${safeK}')">🟥 Expulser l'équipe</div>
            <div class="dropdown-item" style="color:var(--danger);" onclick="closeGlobalDropdown(); deleteTeamDefinitive('${safeK}')">🗑️ Supprimer définitivement</div>
        `;
    } else {
        html = `
            <div class="dropdown-item" onclick="closeGlobalDropdown(); toggleTeamBlock('${safeK}')">${isTeamMuted ? '🟢 Débloquer les buzzers' : '🛑 Bloquer les buzzers'}</div>
            <div class="dropdown-item" onclick="closeGlobalDropdown(); openTeamModal('${safeK}')">✏️ Éditer l'équipe</div>
            <div class="dropdown-item" onclick="closeGlobalDropdown(); archiveTeam('${safeK}')">⏸️ Mettre en pause</div>
            ${t.hasBeenWarned ? `<div class="dropdown-item" style="color:var(--danger);" onclick="closeGlobalDropdown(); kickTeam('${safeK}')">🟥 Expulser l'équipe</div>` : `<div class="dropdown-item" style="color:var(--gold);" onclick="closeGlobalDropdown(); warnTeam('${safeK}')">🟨 Avertir l'équipe</div>`}
            <div class="dropdown-item" style="color:var(--danger);" onclick="closeGlobalDropdown(); deleteTeamDefinitive('${safeK}')">🗑️ Supprimer définitivement</div>
        `;
    }
    showGlobalMenu(e.currentTarget, html);
}

/* --- PATCH V1.210 : MENU MEMBRE SÉCURISÉ --- */
function openMemberMenu(e, uid, teamName, isBlockedInTeam, isCaptain, currentCapId, currentCapName) {
    e.stopPropagation();
    const safeTeamName = teamName.replace(/'/g, "\\'");
    let m = allPlayersData[uid];
    if (!m) m = activeTeamBlacklist.find(x => x.id === uid);
    if (!m) return;
    const safeName = m.name ? m.name.replace(/'/g, "\\'") : "";
    
    // Sécurité si currentCapName n'est pas fourni
    const safeCapName = currentCapName ? currentCapName.replace(/'/g, "\\'") : "";
    
    let html = "";
    if (isBlockedInTeam) {
        html = `<div class="dropdown-item" style="color:var(--success);" onclick="closeGlobalDropdown(); pardonTeamMember('${uid}', '${safeTeamName}')">🔄 Gracier</div>`;
    } else {
        let btnCap = isCaptain ? "" : `<div class="dropdown-item" style="color:var(--gold);" onclick="closeGlobalDropdown(); transferCaptaincy('${currentCapId||''}', '${safeCapName}', '${uid}', '${safeName}', '${safeTeamName}')">👑 Nommer Capitaine</div>`;
        html = `${btnCap} <div class="dropdown-item" style="color:var(--danger);" onclick="closeGlobalDropdown(); expelTeamMember('${uid}', '${safeName}', '${m.avatar}', '${safeTeamName}')">✕ Expulser de l'équipe</div>`;
    }
    showGlobalMenu(e.currentTarget, html);
}

// PATCH V1.228 : Ouverture intelligente du menu (Option A)
function showGlobalMenu(btn, html) {
    const menu = document.getElementById('global-dropdown');
    if (activeDropdownBtn === btn && menu.classList.contains('show')) {
        closeGlobalDropdown();
        return;
    }
    activeDropdownBtn = btn;
    menu.innerHTML = html;
    
    // On le rend visible un quart de seconde pour calculer sa vraie taille
    menu.style.display = 'flex'; 
    menu.style.opacity = '0'; // On le cache le temps du calcul
    
    const rect = btn.getBoundingClientRect();
    const menuHeight = menu.offsetHeight; // On récupère la vraie hauteur du menu !
    const spaceBelow = window.innerHeight - rect.bottom;
    
    // L'Intelligence de l'Option A
    if (spaceBelow < menuHeight + 10) {
        // Il n'y a pas assez de place en bas -> On l'ouvre VERS LE HAUT
        menu.style.top = (rect.top - menuHeight - 5) + 'px';
    } else {
        // Il y a de la place -> On l'ouvre VERS LE BAS normalement
        menu.style.top = (rect.bottom + 5) + 'px';
    }
    
    menu.style.left = 'auto';
    menu.style.right = (window.innerWidth - rect.right) + 'px';
    
    // On le réaffiche avec l'animation
    menu.style.opacity = '1';
    menu.classList.add('show'); 
}

// PATCH V1.230 : Correction du re-clic et fermeture au clic extérieur

function closeGlobalDropdown() {
    const menu = document.getElementById('global-dropdown');
    if (menu) {
        menu.classList.remove('show');
        menu.style.opacity = '0';
        setTimeout(() => { 
            if(!menu.classList.contains('show')) menu.style.display = 'none'; 
        }, 200); // Laisse le temps à l'animation de se faire
    }
    activeDropdownBtn = null; // LA CORRECTION DU BUG : On vide la mémoire du bouton !
}

// LE DÉTECTEUR GLOBAL : Ferme le menu si on clique n'importe où ailleurs
document.addEventListener('click', function(event) {
    const menu = document.getElementById('global-dropdown');
    // Si le menu est visible à l'écran...
    if (menu && menu.classList.contains('show')) {
        // ...et qu'on clique AILLEURS que dans le menu ou sur le bouton des 3 petits points
        if (!menu.contains(event.target) && activeDropdownBtn && !activeDropdownBtn.contains(event.target)) {
            closeGlobalDropdown();
        }
    }
});

function openSuperAdmin() { if(!isSuperAdmin) return; document.getElementById('screen-choice').style.display = 'none'; document.getElementById('screen-super-admin').style.display = 'block'; }
function closeSuperAdmin() { document.getElementById('screen-super-admin').style.display = 'none'; document.getElementById('screen-choice').style.display = 'block'; }

function getCurArr() { if(curLbType === 'crest') return lbCrests; if(curLbType === 'bgModal') return lbBgsModal; return []; }
function openLightbox(idx, type) { curLbType = type; curLbIdx = idx; document.getElementById('univ-lightbox').style.display = 'flex'; updateLightbox(); }
function updateLightbox() {
    let arr = getCurArr(); if(arr.length === 0) return closeLightbox();
    if(curLbIdx >= arr.length) curLbIdx = 0; if(curLbIdx < 0) curLbIdx = arr.length - 1;
    const item = arr[curLbIdx];
    document.getElementById('lb-img').src = item.url;
    document.getElementById('lb-del').style.display = item.isNative ? 'none' : 'flex';
}
function closeLightbox(e) { if(e) e.stopPropagation(); document.getElementById('univ-lightbox').style.display = 'none'; }
function lbPrev(e) { if(e) e.stopPropagation(); curLbIdx--; updateLightbox(); }
function lbNext(e) { if(e) e.stopPropagation(); curLbIdx++; updateLightbox(); }

function physicalDelete(url) { if(url && url.includes('firebasestorage')) { try{ storage.refFromURL(url).delete().catch(e => console.log("Cloud err:", e.message)); }catch(err){} } }
function lbDelete(e) {
    if(e) e.stopPropagation(); let arr = getCurArr(); const item = arr[curLbIdx]; if(item.isNative) return;
    if(confirm("Voulez-vous vraiment supprimer définitivement cette image ?")) {
        if(item.type === 'crest') executeCrestDelete(item.key, item.url);
        else if(item.type === 'bg' && item.mode === 'modal') executeBgDeleteModal(item.key, item.url);
        physicalDelete(item.url);
        setTimeout(updateLightbox, 500); 
    }
}

function openLibraryProxy(mode) { isProxyMode = (mode === 'proxy'); activeLibraryUid = isProxyMode ? targetMjUid : auth.currentUser.uid; document.getElementById('switch-container-lib').style.display = isProxyMode ? 'none' : 'flex'; document.getElementById('modal-library').style.display = 'flex'; loadModalLibrary(); }
function closeLibrary() { document.getElementById('modal-library').style.display = 'none'; if(isProxyMode) { isProxyMode = false; activeLibraryUid = auth.currentUser.uid; } }

function loadModalLibrary() {
    const uid = activeLibraryUid || auth.currentUser.uid;
    db.ref(`users/${uid}/library`).once('value').then(snap => {
        const libData = snap.val() || {};
        if (!isProxyMode) { mjLibrary = libData; syncLibraryToRoom(); }
        renderModalLibraryGrid(libData); 
    }).catch(e => console.error("Erreur Library:", e));
}

function renderModalLibraryGrid(libData) {
    const grid = document.getElementById('lib-grid'); if(!grid) return; grid.innerHTML = ""; lbCrests = [];
    const entries = Object.entries(libData || {}); const recent = entries.filter(e => e[0].startsWith('-')); const old = entries.filter(e => !e[0].startsWith('-')); recent.sort((a, b) => a[0].localeCompare(b[0])).reverse();
    [...recent, ...old].forEach(e => lbCrests.push({ key: e[0], url: e[1], isNative: false, type: 'crest' }));
    if (showDefaultCrests) { for(let i=0; i<30; i++) lbCrests.push({ key: null, url: createBlason(i), isNative: true, type: 'crest' }); }
    
    if (lbCrests.length === 0) {
        grid.innerHTML = "<p style='width:100%; grid-column: 1 / -1; text-align:center; color:#7f8c8d; font-style:italic;'>Aucun blason. Cliquez sur le dossier 📁 ou glissez une image ici.</p>";
        return;
    }

    lbCrests.forEach((item, i) => { 
        const div = document.createElement('div'); 
        div.className = 'lib-item'; 
        div.onclick = () => openLightbox(i, 'crest'); 
        if (item.url.startsWith('data:image/svg')) {
             div.innerHTML = `<img src="${item.url}">`;
        } else {
             div.style.background = 'transparent';
             div.style.border = 'none';
             div.innerHTML = `<img src="${item.url}" style="border-radius: 4px;">`;
             
             const del = document.createElement('div');
             del.className = 'lib-del';
             del.innerHTML = '✖';
             del.title = "Supprimer ce blason";
             del.onclick = (e) => {
                 e.stopPropagation();
                 if(confirm("Supprimer définitivement ce blason de votre galerie ?")) {
                     executeCrestDelete(item.key, item.url);
                 }
             };
             div.appendChild(del);
        }
        grid.appendChild(div); 
    });
}

function addCrestUrlToLibrary() {
    const u = document.getElementById('lib-url-input').value.trim();
    if(!u || (!u.startsWith('http') && !u.startsWith('data:image/'))) return alert("URL invalide.");
    db.ref(`users/${activeLibraryUid || auth.currentUser.uid}/library`).push(u).then(()=>{
        document.getElementById('lib-url-input').value = "";
        loadModalLibrary();
    }).catch(e=>alert("Erreur: "+e.message));
}

function executeCrestDelete(key, urlToDelete) {
    const uid = activeLibraryUid || auth.currentUser.uid;
    if(!isProxyMode && globalTeams) { 
        Object.keys(globalTeams).forEach(tKey => { 
            if(globalTeams[tKey].icon === urlToDelete) {
                logEvent('SYSTEM', `🛠️ Remplacement auto du blason supprimé pour l'équipe ${tKey}`); // 🟢 L'ULTIME CAPTEUR
                roomRef.child('teams/' + tKey).update({ icon: mjProfileData.customLogo || APP_CONFIG.LOGO_URL });
			}
        }); 
    }
    db.ref(`users/${uid}/library/${key}`).remove().catch(e=>alert("Erreur BDD: "+e.message)).then(() => {
        loadModalLibrary();
        if(document.getElementById('modal-team-edit').style.display === 'flex') {
            delete mjLibrary[key];
            loadModalCrestGrid();
        }
    });
}

async function handleFiles(files) {
    if(!files || files.length === 0) return; const uid = activeLibraryUid || auth.currentUser.uid;
    for (let i = 0; i < files.length; i++) { 
        try { 
            await new Promise((resolve, reject) => { storage.ref(`mj_library/${uid}/${Date.now()}_${files[i].name}`).put(files[i]).then(s => s.ref.getDownloadURL()).then(u => db.ref(`users/${uid}/library`).push(u).then(()=>resolve(u))).catch(reject); }); 
        } catch(e){} 
    }
    loadModalLibrary(); 
}

function createBlason(i) { 
    const colorPairs = [
        ['#e74c3c', '#f1c40f'], ['#3498db', '#ecf0f1'], ['#2ecc71', '#2c3e50'],
        ['#9b59b6', '#f1c40f'], ['#e67e22', '#2c3e50'], ['#1abc9c', '#ecf0f1'],
        ['#34495e', '#e74c3c'], ['#f39c12', '#8e44ad'], ['#2980b9', '#27ae60'],
        ['#c0392b', '#bdc3c7']
    ];
    const pair = colorPairs[Math.floor(i / 3) % 10];
    const c1 = pair[0]; const c2 = pair[1];
    const m = i % 3;
    let p = "";
    if (m === 0) p = `<rect width="100" height="100" fill="${c1}"/><rect x="40" width="20" height="100" fill="${c2}"/><rect y="40" width="100" height="20" fill="${c2}"/>`;
    else if (m === 1) p = `<rect width="100" height="100" fill="${c1}"/><path d="M0 0 L100 100 M100 0 L0 100" stroke="${c2}" stroke-width="20"/>`;
    else p = `<rect width="100" height="100" fill="${c1}"/><path d="M0 50 L50 0 L100 50 L50 100 Z" fill="${c2}"/>`;
    return `data:image/svg+xml;base64,${btoa(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="800" height="800"><defs><clipPath id="shield"><path d="M10 0 H90 V40 C90 80 50 100 50 100 C50 100 10 80 10 40 Z"/></clipPath></defs><g clip-path="url(#shield)">${p}</g><path d="M10 0 H90 V40 C90 80 50 100 50 100 C50 100 10 80 10 40 Z" fill="none" stroke="#000" stroke-width="2"/></svg>`)}`; 
}

function toggleDefaultCrests(checked) { showDefaultCrests = checked; if (!isProxyMode) { db.ref(`users/${auth.currentUser.uid}/showDefaultCrests`).set(checked); mjProfileData.showDefaultCrests = checked; } loadModalLibrary(); }

function toggleDefaultCrestsFromModal(checked) {
    showDefaultCrests = checked;
    if (!isProxyMode) {
        db.ref(`users/${auth.currentUser.uid}/showDefaultCrests`).set(checked);
        if(roomRef) {
            logEvent('SYSTEM', `MJ a ${checked ? 'affiché' : 'masqué'} les blasons par défaut`); // 🟢 CAPTEUR
            roomRef.child('showDefaultCrests').set(checked);
        }
        mjProfileData.showDefaultCrests = checked;
        const mainSwitch = document.getElementById('check-hide-default');
        if(mainSwitch) mainSwitch.checked = checked;
    }
    loadModalCrestGrid();
}

function openBgLibraryProxy(mode) { isProxyBgMode = (mode === 'proxy'); activeBgLibraryUid = isProxyBgMode ? targetMjUid : auth.currentUser.uid; modalSelectedBgUrl = ""; document.getElementById('btn-modal-bg-default').disabled = true; document.getElementById('btn-modal-bg-console').disabled = true; document.getElementById('modal-bg-library').style.display = 'flex'; loadBgLibrary('modal'); }
function closeBgLibrary() { document.getElementById('modal-bg-library').style.display = 'none'; if(isProxyBgMode) { isProxyBgMode = false; activeBgLibraryUid = auth.currentUser.uid; } }
function loadBgLibrary(mode) {
    const uid = (mode === 'modal') ? activeBgLibraryUid : auth.currentUser.uid;
    db.ref(`users/${uid}/bgLibrary`).once('value').then(snap => { const libData = snap.val() || {}; if (mode === 'dashboard' || !isProxyBgMode) { mjBgLibrary = libData; } if (mode === 'modal') { renderBgGalleryModal(libData); } }).catch(e=>console.error(e));
}
function renderBgGalleryModal(libData) {
    const grid = document.getElementById('bg-modal-gallery'); if(!grid) return; grid.innerHTML = ""; lbBgsModal = [];
    Object.entries(libData || {}).reverse().forEach(e => lbBgsModal.push({key: e[0], url: e[1], isNative: false, type: 'bg', mode: 'modal'}));
    
    if (lbBgsModal.length === 0) {
        grid.innerHTML = "<p style='width:100%; grid-column: 1 / -1; text-align:center; color:#7f8c8d; font-style:italic;'>Aucun fond d'écran. Cliquez sur le dossier 📁 ou glissez une image ici.</p>";
        return;
    }

    lbBgsModal.forEach((item, i) => { 
        const div = document.createElement('div'); div.className = 'bg-item'; 
        if(modalSelectedBgUrl === item.url) div.classList.add('bg-selected'); 
        div.onclick = () => { document.querySelectorAll('#bg-modal-gallery .bg-item').forEach(el => el.classList.remove('bg-selected')); div.classList.add('bg-selected'); modalSelectedBgUrl = item.url; document.getElementById('btn-modal-bg-default').disabled = false; document.getElementById('btn-modal-bg-console').disabled = false; openLightbox(i, 'bgModal'); }; 
        div.style.background = 'transparent'; div.innerHTML = `<img src="${item.url}">`; grid.appendChild(div); 
    });
}
function executeBgDeleteModal(key, urlToDelete) {
    const uid = activeBgLibraryUid;
    if(modalSelectedBgUrl === urlToDelete) { modalSelectedBgUrl = ""; document.getElementById('btn-modal-bg-default').disabled = true; document.getElementById('btn-modal-bg-console').disabled = true; }
    db.ref(`users/${uid}/defaultBackground`).once('value', s => { if(s.val() === urlToDelete) db.ref(`users/${uid}/defaultBackground`).remove(); });
    db.ref(`users/${uid}/consoleBackground`).once('value', s => { if(s.val() === urlToDelete) { db.ref(`users/${uid}/consoleBackground`).remove(); if(!isProxyBgMode) applyMjConsoleBg(null); } });
    
    if (!isProxyBgMode && currentRoomBgUrl === urlToDelete && roomRef) {
        logEvent('SYSTEM', `🛠️ Le MJ a supprimé le fond d'écran actif de sa galerie (Réinitialisation auto)`); // 🟢 L'ULTIME CAPTEUR
        roomRef.child('customBackground').remove();
    }
    
    db.ref(`users/${uid}/bgLibrary/${key}`).remove().catch(e=>alert("Erreur BDD: "+e.message)).then(() => loadBgLibrary('modal'));
}

function handleBgUpload(files, mode) { if(!files||files.length===0)return; const file=files[0], uid=mode==='modal'?activeBgLibraryUid:auth.currentUser.uid; storage.ref(`mj_custom_bgs/${uid}/${Date.now()}_${file.name}`).put(file).then(s=>s.ref.getDownloadURL()).then(u=>{ db.ref(`users/${uid}/bgLibrary`).push(u).then(()=>{ loadBgLibrary(mode); }); }).catch(e=>alert("Erreur: "+e.message)); }
function addBgUrlToLibrary(mode) { const i=document.getElementById('bg-modal-url-input'), u=i.value.trim(); if(!u||(!u.startsWith('http')&&!u.startsWith('data:image/')))return alert("URL invalide."); db.ref(`users/${activeBgLibraryUid || auth.currentUser.uid}/bgLibrary`).push(u).then(()=>{ i.value=""; loadBgLibrary(mode); }).catch(e=>alert("Erreur: "+e.message)); }
function setModalBgAction(type) { if(!modalSelectedBgUrl)return; const uid=activeBgLibraryUid; if(type==='default'){ db.ref(`users/${uid}/defaultBackground`).set(modalSelectedBgUrl).then(()=>{alert("Fond par défaut enregistré !");if(!isProxyBgMode)mjProfileData.defaultBackground=modalSelectedBgUrl;}); } else { db.ref(`users/${uid}/consoleBackground`).set(modalSelectedBgUrl).then(()=>{alert("Fond console enregistré !");if(!isProxyBgMode){mjProfileData.consoleBackground=modalSelectedBgUrl;applyMjConsoleBg(modalSelectedBgUrl);}}); } }
function applyMjConsoleBg(url) { const bg=document.getElementById('dynamic-bg'); if(url&&url!==""){ bg.style.background=`url('${url}') center/cover no-repeat`; bg.style.animation='none'; }else{ bg.style.background='linear-gradient(45deg, #0f0c29, #302b63, #24243e)'; bg.style.backgroundSize='300% 300%'; bg.style.animation='gradientBG 15s ease infinite'; } }

function handleProfileFile(files) { 
    if(!files||files.length===0)return; 
    const storageRef=storage.ref(`mj_profile_logos/${auth.currentUser.uid}/logo_${Date.now()}`); 
    document.getElementById('prof-logo-placeholder').style.opacity='0.3'; 
    storageRef.put(files[0]).then(s=>s.ref.getDownloadURL()).then(u=>{ 
        document.getElementById('prof-logo-placeholder').style.display='none'; 
        const img=document.getElementById('prof-logo-preview'); 
        img.src=u; img.style.display='block'; 
        document.getElementById('prof-logo-url').value=u; 
        document.getElementById('btn-undo-logo').style.display='block';
        document.getElementById('prof-logo-placeholder').style.opacity='1';
    }).catch(e=>alert("Erreur upload: "+e.message)); 
}

function undoProfileLogo() {
    const originalLogo = mjProfileData.customLogo || "";
    document.getElementById('prof-logo-url').value = originalLogo;
    updateLogoPreview(originalLogo);
    document.getElementById('btn-undo-logo').style.display = 'none';
}

function updateLogoPreview(u) { const p=document.getElementById('prof-logo-preview'), h=document.getElementById('prof-logo-placeholder'); if(u){p.src=u;p.style.display='block';h.style.display='none';}else{p.style.display='none';h.style.display='block';} }
function showProfile() {
    if(document.getElementById('screen-choice').style.display==="block") window.previousScreen="screen-choice";
    else if(document.getElementById('screen-dashboard').style.display==="block") window.previousScreen="screen-dashboard";
    else if(!window.previousScreen) window.previousScreen="screen-choice";
    document.getElementById('screen-choice').style.display="none"; document.getElementById('screen-dashboard').style.display="none"; document.getElementById('screen-profile').style.display="block";
    document.getElementById('top-right-tools').style.display="none";
    document.getElementById('btn-undo-logo').style.display="none";
    if(auth.currentUser) {
        document.getElementById('prof-email').value=auth.currentUser.email; document.getElementById('prof-nom').value=mjProfileData.nom||""; document.getElementById('prof-prenom').value=mjProfileData.prenom||"";
        const cl = mjProfileData.customLogo||""; document.getElementById('prof-logo-url').value=cl; updateLogoPreview(cl); document.getElementById('prof-link').value=mjProfileData.customLink||"";
        const isG = mjProfileData.isGuest===true; ['prof-nom','prof-prenom','prof-link','prof-email'].forEach(id=>document.getElementById(id).disabled=isG); document.getElementById('btn-save-profile').disabled=isG;
        const dz=document.getElementById('profile-drop-zone'); if(isG){dz.style.opacity='0.5';dz.style.pointerEvents='none';}else{dz.style.opacity='1';dz.style.pointerEvents='auto';}
    }
    if (window.isTutoRunning && typeof window.onTutoProfileOpened === 'function') {
        window.onTutoProfileOpened();
    }
}
function closeProfile() {
    const targetScr = window.previousScreen || "screen-choice";
    const profEl = document.getElementById('screen-profile');
    profEl.style.display = "none";
    profEl.classList.remove('tuto-highlight');
    document.body.classList.remove('tuto-profile-open');
    document.getElementById(targetScr).style.display = "block";
    if (targetScr === "screen-dashboard") document.getElementById('top-right-tools').style.display = "flex";
    if (window.isTutoRunning && typeof window.onTutoProfileClosed === 'function') {
        window.onTutoProfileClosed();
    }
}

async function saveProfile() {
    if(mjProfileData.isGuest===true) return alert("Action impossible en Découverte.");
    
    const btn = document.getElementById('btn-save-profile');
    if(btn && btn.disabled) return; // 🚀 PROTECTION ANTI-BYPASS "ENTRÉE"
    
    const user = auth.currentUser; if(!user) return;
    const newE = document.getElementById('prof-email').value.trim(), passC = document.getElementById('prof-pass-current').value, pass1 = document.getElementById('prof-pass').value, pass2 = document.getElementById('prof-pass-conf').value;
    const eCh = newE!==user.email, pCh = pass1!=="";
    const upd = { nom: document.getElementById('prof-nom').value.trim(), prenom: document.getElementById('prof-prenom').value.trim(), customLogo: document.getElementById('prof-logo-url').value.trim(), customLink: document.getElementById('prof-link').value.trim() };
    if (eCh || pCh) {
        if(!passC) return alert("Mot de passe ACTUEL requis.");
        if(pCh) { if(pass1===passC) return alert("Le nouveau mdp doit être différent."); if(pass1!==pass2) return alert("Mots de passe différents."); if(!isValidPassword(pass1)) return alert("Critères de sécurité non respectés."); }
        try {
            await user.reauthenticateWithCredential(firebase.auth.EmailAuthProvider.credential(user.email, passC));
            if (eCh) { await user.updateEmail(newE); upd.email = newE; }
            if (pCh) await user.updatePassword(pass1);
        } catch(e) { return alert("Mot de passe actuel incorrect."); }
    }
    db.ref('users/'+user.uid).update(upd).then(()=>{ alert("Profil mis à jour !"); mjProfileData={...mjProfileData, ...upd}; document.getElementById('mj-display-name').innerText=upd.prenom||"MJ"; updateLogos(upd.customLogo); document.getElementById('prof-pass-current').value=""; document.getElementById('prof-pass').value=""; document.getElementById('prof-pass-conf').value=""; closeProfile(); }).catch(e=>alert("Erreur: "+e.message));
}

function updateLogos(url) { 
	const defaultLogo = APP_CONFIG.LOGO_URL;
	const oldWixLogo = APP_CONFIG.LOGO_BUZTAPUCE;
	const f = (url && url !== "" && url !== oldWixLogo && url !== defaultLogo) ? url : defaultLogo; 

	document.getElementById('login-mj-logo').src = f; 
	document.getElementById('page-favicon').href = f;
    
    const flipInner = document.getElementById('logo-flip-inner');
    const mjLogoImg = document.getElementById('flip-back-logo');
    
    if(f !== defaultLogo) {
        if(mjLogoImg) mjLogoImg.src = f;
        if(flipInner) flipInner.classList.add('animate');
    } else {
        if(mjLogoImg) mjLogoImg.src = "";
        if(flipInner) flipInner.classList.remove('animate');
    }

    if(roomRef && roomID) { 
        logEvent('SYSTEM', `MJ a mis à jour son identité visuelle en direct (Logo/Lien)`); // 🟢 L'AVANT-DERNIER CAPTEUR
        roomRef.child('mjLogo').set(f); 
        if(mjProfileData.customLink) roomRef.child('mjLink').set(mjProfileData.customLink); 
    } 
}


// --- MODALE ÉQUIPE & SUCCESSION CAPITAINE ---
function openTeamModal(tName) {
    editingTeamKey = tName;
    document.getElementById('modal-team-edit').style.display = 'flex';
    document.getElementById('modal-check-hide-default').checked = showDefaultCrests;
    const nameInput = document.getElementById('modal-t-name');
    
    if (tName) {
        document.getElementById('team-modal-title').innerText = "MODIFIER L'ÉQUIPE";
        nameInput.value = tName;
        selCrest = globalTeams[tName] ? globalTeams[tName].icon : "";
    } else {
        document.getElementById('team-modal-title').innerText = "CRÉER UNE ÉQUIPE";
        nameInput.value = "";
        selCrest = "";
    }
    
    loadModalCrestGrid();
    setTimeout(() => nameInput.focus(), 100);
}

function loadModalCrestGrid() {
    const grid = document.getElementById('modal-crest-grid'); if(!grid) return; grid.innerHTML = "";
    const seen = new Set();
    
    const entries = Object.entries(mjLibrary || {});
    const recent = entries.filter(e => e[0].startsWith('-'));
    const old = entries.filter(e => !e[0].startsWith('-'));
    recent.sort((a, b) => a[0].localeCompare(b[0])).reverse();
    
    [...recent, ...old].forEach(entry => {
        const key = entry[0]; const url = entry[1];
        if (!seen.has(url)) {
            seen.add(url);
            createModalCrestItem(key, url, grid, true);
        }
    });

    if (showDefaultCrests) {
        for(let i=0; i<30; i++) {
            const svg = createBlason(i);
            if (!seen.has(svg)) {
                seen.add(svg);
                createModalCrestItem(null, svg, grid, false);
            }
        }
    }
}

function createModalCrestItem(key, url, container, isCustom) {
    const w = document.createElement('div');
    w.className = 'crest-wrapper';
    if (selCrest === url) w.classList.add('crest-selected');
    
    if (url.startsWith('data:image/svg')) {
        w.innerHTML = `<img src="${url}" class="crest-opt">`;
    } else {
        w.style.background = 'transparent';
        w.innerHTML = `<img src="${url}" class="crest-opt">`;
    }

    if (isCustom) {
        const del = document.createElement('div');
        del.className = 'crest-del-btn';
        del.innerHTML = '✖';
        del.title = "Supprimer ce blason";
        del.onclick = (e) => {
            e.stopPropagation();
            if(confirm("Supprimer définitivement ce blason ?")) {
                executeCrestDelete(key, url);
            }
        };
        w.appendChild(del);
    }

    w.onclick = () => {
        document.querySelectorAll('#modal-crest-grid .crest-wrapper').forEach(i=>i.classList.remove('crest-selected'));
        w.classList.add('crest-selected');
        selCrest = url;
    };
    container.appendChild(w);
}

function handleTeamModalUpload(files) {
    if(!files || files.length === 0) return;
    const file = files[0];
    const uid = auth.currentUser.uid;
    document.getElementById('team-modal-title').innerText = "⏳ Upload en cours...";
    storage.ref(`mj_library/${uid}/${Date.now()}_${file.name}`).put(file).then(s => s.ref.getDownloadURL()).then(u => {
        db.ref(`users/${uid}/library`).push(u).then(() => {
            selCrest = u;
            document.getElementById('team-modal-title').innerText = editingTeamKey ? "MODIFIER L'ÉQUIPE" : "CRÉER UNE ÉQUIPE";
            loadModalCrestGrid(); 
        });
    }).catch(e => {
        alert("Erreur upload: " + e.message);
        document.getElementById('team-modal-title').innerText = editingTeamKey ? "MODIFIER L'ÉQUIPE" : "CRÉER UNE ÉQUIPE";
    });
}

function saveTeamFromModal() {
    const n = document.getElementById('modal-t-name').value.trim();
    if(!n) return alert("Veuillez saisir un nom d'équipe.");
    // PATCH V1.231 : Vigile Anti-Crash BDD
	if(/[.#$\[\]\/]/.test(n)) return alert("Les caractères suivants sont interdits : . # $ [ ] /");
    if(!selCrest) return alert("Veuillez sélectionner un blason.");
    if (window.isSandboxMode) {
        if (editingTeamKey && editingTeamKey !== n) {
            const oldData = globalTeams[editingTeamKey] || { active: true, bonus: 0 };
            globalTeams[n] = { ...oldData, icon: selCrest };
            delete globalTeams[editingTeamKey];
            Object.values(allPlayersData).forEach(p => { if (p.teamName === editingTeamKey) p.teamName = n; });
        } else {
            if (!editingTeamKey && globalTeams[n]) return alert("Ce nom d'équipe existe déjà.");
            globalTeams[n] = { active: true, bonus: globalTeams[n] ? globalTeams[n].bonus : 0, icon: selCrest };
        }
        document.getElementById('modal-team-edit').style.display = 'none';
        updateSimuPhones(); renderLobby(); renderTeamLobby();
        return;
    }
    
    if(mjProfileData.isGuest === true && !editingTeamKey && Object.keys(globalTeams).length >= 2) return alert("Limité à 2 équipes en Découverte.");
    
    if(editingTeamKey && editingTeamKey !== n) {
        roomRef.child('teams/' + editingTeamKey).once('value').then(snap => {
            const data = snap.val();
            roomRef.child('teams/' + n).set({...data, icon: selCrest}).then(() => {
                logEvent('SYSTEM', `MJ a renommé l'équipe ${editingTeamKey} en ${n}`); // 🟢 CAPTEUR
                roomRef.child('teams/' + editingTeamKey).remove();
                roomRef.child('players').once('value', pSnap => {
                    let updates = {};
                    pSnap.forEach(p => {
                        if(p.val().teamName === editingTeamKey) {
                            updates[p.key + '/teamName'] = n;
                            updates[p.key + '/teamIcon'] = selCrest;
                        }
                    });
                    if(Object.keys(updates).length > 0) roomRef.child('players').update(updates);
                });
                document.getElementById('modal-team-edit').style.display = 'none';
            });
        });
    } else {
	    /* --- PATCH 3.20 : ANTI-ÉCRASEMENT --- */
        if (!editingTeamKey && globalTeams[n]) {
            return alert("Ce nom d'équipe existe déjà. Veuillez en choisir un autre.");
        }
        logEvent('SYSTEM', `MJ a ${editingTeamKey ? 'modifié' : 'créé'} l'équipe : ${n}`); // 🟢 CAPTEUR
        roomRef.child('teams/' + n).update({ icon: selCrest, active: true, bonus: globalTeams[n] ? globalTeams[n].bonus : 0 });
        document.getElementById('modal-team-edit').style.display = 'none';
    }
}

/* --- PATCH V1.210 : PHRASES DE TRANSFERT EXACTES --- */
function transferCaptaincy(oldId, oldName, newId, newName, teamName) {
    if (window.isSandboxMode) {
        Object.keys(allPlayersData).forEach(k => {
            if (allPlayersData[k].teamName === teamName) allPlayersData[k].isCaptain = false;
        });
        if (allPlayersData[newId]) allPlayersData[newId].isCaptain = true;
        updateSimuPhones(); renderLobby(); renderTeamLobby(); renderTeamMembers(teamName);
        return;
    }
    const displayOld = oldName || "L'ancien capitaine";
    window.mjConfirm("👑 Changement de Capitaine", `Retirer la couronne à ${displayOld} pour nommer ${newName} capitaine de l'équipe ${teamName} ?`, () => {
        logEvent('SYSTEM', `MJ a transféré le capitanat de ${teamName} à ${newName}`);
        let updates = {};
        Object.keys(allPlayersData).forEach(k => {
            if (allPlayersData[k].teamName === teamName && allPlayersData[k].isCaptain) {
                updates[k + '/isCaptain'] = false;
            }
        });
        if(oldId) {
            updates[oldId + '/isCaptain'] = false;
            updates[oldId + '/captainMessage'] = `ℹ️ Vous avez été destitué du rôle de capitaine de l'équipe ${teamName}. Le rôle de capitaine a été attribué à ${newName}.`;
        }
        updates[newId + '/isCaptain'] = true;
        updates[newId + '/captainMessage'] = `👑 ${displayOld} n'est plus capitaine. Vous êtes le nouveau capitaine de l'équipe ${teamName}.`;
        roomRef.child('players').update(updates);
    }, "👑 Nommer Capitaine", "var(--gold)");
}

/* --- PATCH V1.269 : SUCCESSION AUTOMATIQUE ABSOLUE (Anti-Trône Vide) --- */
function handleCaptainSuccession(teamName) {
    const members = Object.keys(allPlayersData)
        .map(uid => ({ uid, ...allPlayersData[uid] }))
        .filter(p => p.teamName === teamName && !p.banned);

    const currentCaptain = members.find(p => p.isCaptain === true);

    // Se déclenche si le capitaine actuel est inactif, OU s'il n'y a plus aucun capitaine (trône vide)
    if (!currentCaptain || (currentCaptain && currentCaptain.active === false)) {
        const activeMembers = members
            .filter(p => p.active !== false)
            .sort((a, b) => (a.joinTimestamp || 0) - (b.joinTimestamp || 0));

        if (activeMembers.length > 0) {
            const nextId = activeMembers[0].uid;
            const nextName = activeMembers[0].name || "Inconnu";
            let updates = {};

            if (currentCaptain) {
                const oldId = currentCaptain.uid;
                const oldName = currentCaptain.name || "L'ancien capitaine";
                updates[oldId + '/isCaptain'] = false;
                updates[oldId + '/captainMessage'] = `ℹ️ Vous n'êtes plus capitaine de l'équipe ${teamName}. ${nextName} est le nouveau capitaine.`;
                updates[nextId + '/captainMessage'] = `👑 ${oldName} n'est plus actif. Vous êtes le nouveau capitaine de l'équipe ${teamName} !`;
            } else {
                // Cas du transfert forcé : Le capitaine a disparu de l'équipe
                updates[nextId + '/captainMessage'] = `👑 Le trône était vide. Vous êtes le nouveau capitaine de l'équipe ${teamName} !`;
            }
            
            updates[nextId + '/isCaptain'] = true;
            
            logEvent('SYSTEM', `👑 Succession auto : ${nextName} devient capitaine de ${teamName}`); // 🟢 CAPTEUR
            roomRef.child('players').update(updates);
        }
    }
}

