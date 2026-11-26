/* ============================================================================
 * index-profile.js — Galerie Avatars, Selfies, Choix Équipe/Solo & Édition Profil
 * Application Joueurs - Buz'Ta Puce (v1.315)
 * ============================================================================ */

// FIX: Auto-réinitialisation visuelle de l'écran (si on fait retour ou si on arrive)
var stepAvatarEl = document.getElementById('step-avatar');
if(stepAvatarEl) {
    new MutationObserver(function(mutations) {
        mutations.forEach(function(m) {
            if (m.attributeName === "class" && m.target.classList.contains('active')) {
                document.getElementById('avatar-express-actions').style.display = 'flex';
                document.getElementById('avatar-choices').style.display = 'none';
                document.getElementById('avatar-gallery-view').style.display = 'none';
                document.getElementById('avatar-choice-container').style.display = 'none';
                document.getElementById('avatar-status-text').innerText = "Identité pour cette partie :";
                
                // 🚀 LE CORRECTIF VISUEL : On injecte la photo mémoire dans le cercle
                var preview = document.getElementById('avatar-preview');
                if (player.avatar) {
                    if (player.avatar.includes('http') || player.avatar.includes('data:image')) {
                        preview.innerHTML = '<img src="' + player.avatar + '" alt="Avatar" style="width:100%; height:100%; object-fit:cover;">';
                    } else {
                        preview.innerHTML = player.avatar; // C'est un émoji
                    }
                }
            }
        });
    }).observe(stepAvatarEl, { attributes: true });
}

function showAvatarGallery() { document.getElementById('avatar-choices').style.display = 'none'; document.getElementById('avatar-gallery-view').style.display = 'flex'; }
function handleFileUpload(input) { if(input.files[0]) { compressImage(input.files[0], 300, function(base64) { selectAvatar(base64); }); } }
function renderAvatarGrid() { const g=document.getElementById('avatar-grid'); avatars.forEach(a=>{ const d=document.createElement('div'); d.className='grid-item grid-item-emoji'; d.innerText=a; d.onclick=()=>selectAvatar(a); g.appendChild(d); }); }

function selectAvatar(av) { 
    player.avatar = av; 
    var preview = document.getElementById('avatar-preview');
    if(preview) {
        if (av.length > 20) {
            preview.innerHTML = `<img src="${av}" style="width:100%; height:100%; object-fit:cover;">`;
        } else {
            preview.innerHTML = av;
        }
    }
    
    document.getElementById('avatar-gallery-view').style.display = 'none';
    document.getElementById('avatar-choices').style.display = 'none';
    document.getElementById('avatar-express-actions').style.display = 'flex';
    document.getElementById('avatar-status-text').innerText = "Nouvelle identité prête :";
}

// --- PATCH V1.251 : MOTEUR DE LA GALERIE HYBRIDE ET RÉCUPÉRATION ---
window.avatarHistory = []; 
window.pendingSelfie = null; // Le fameux Buffer temporaire

window.showClassicAvatarMenu = function() {
    document.getElementById('avatar-express-actions').style.display = 'none';
    document.getElementById('avatar-choices').style.display = 'flex';
    document.getElementById('avatar-status-text').innerText = "Modifier mon apparence";
    
    // 🚀 SÉCURITÉ : Si on est un joueur CRM (ID ne commence pas par u_) et que l'historique est vide, on le télécharge !
    if ((!window.avatarHistory || window.avatarHistory.length === 0) && myUserID && !myUserID.startsWith('u_')) {
        firebase.database().ref('users_crm/' + myUserID).once('value').then(snap => {
            if(snap.exists() && snap.val().avatarHistory) {
                window.avatarHistory = snap.val().avatarHistory;
                document.getElementById('btn-avatar-history').style.display = 'flex';
            }
        });
    }
    
    if (window.avatarHistory && window.avatarHistory.length > 0) {
        document.getElementById('btn-avatar-history').style.display = 'flex';
    } else {
        document.getElementById('btn-avatar-history').style.display = 'none';
    }
};

// 🚀 NOUVEAU : Fonction pour ouvrir directement le menu depuis le jeu
window.openAvatarMenuDirectly = function() {
    editStep('step-avatar');
    window.showClassicAvatarMenu();
};

window.hideClassicAvatarMenu = function() {
    document.getElementById('avatar-express-actions').style.display = 'flex';
    document.getElementById('avatar-choices').style.display = 'none';
    document.getElementById('avatar-gallery-view').style.display = 'none';
    document.getElementById('avatar-history-view').style.display = 'none';
    document.getElementById('avatar-status-text').innerText = "Identité pour cette partie :";
};

window.updateHistoryCounter = function() {
    const counter = document.getElementById('history-counter');
    if(!counter) return;
    const count = window.avatarHistory.length;
    counter.innerText = count + " / 10";
    if (count >= 10) counter.style.color = "#ff4444"; // Rouge plein
    else if (count >= 8) counter.style.color = "#ffbb33"; // Orange alerte
    else counter.style.color = "#ffffff"; // Normal
};

window.showAvatarHistory = function() {
    document.getElementById('avatar-choices').style.display = 'none';
    document.getElementById('avatar-history-view').style.display = 'flex';
    
    // 🚀 LOGIQUE D'AFFICHAGE UNIFIÉE (Avatar Actuel + Historique)
    let displayList = [];
    if (player.avatar) displayList.push({ url: player.avatar, isCurrent: true });
    window.avatarHistory.forEach(h => { if(h.url !== player.avatar) displayList.push(h); });
    
    window.updateHistoryCounter();
    const grid = document.getElementById('avatar-history-grid');
    grid.innerHTML = '';
    
    displayList.forEach(function(avObj, dIndex) {
        let wrapper = document.createElement('div');
        wrapper.style.cssText = 'position:relative; width:100%; aspect-ratio:1/1;';
        
        let div = document.createElement('div');
        div.className = 'grid-item-emoji';
        div.style.cssText = 'width:100%; height:100%; margin:0;';
        
        let isImage = avObj.url.includes('http') || avObj.url.includes('data:image');
        if(isImage) {
            div.innerHTML = '<img src="' + avObj.url + '" style="width:100%; height:100%; object-fit:cover;">';
            div.style.padding = "0"; div.style.overflow = "hidden";
        } else { div.innerText = avObj.url; }
        
        // Si c'est l'avatar actuel, on ajoute un petit badge visuel
        if(avObj.isCurrent) {
            let badge = document.createElement('div');
            badge.innerHTML = 'ACTUEL';
            badge.style.cssText = 'position:absolute; bottom:0; width:100%; background:rgba(39,174,96,0.8); color:white; font-size:8px; font-weight:bold; text-align:center; padding:2px 0; z-index:4;';
            wrapper.appendChild(badge);
            div.style.border = "2px solid var(--success)";
        }

        div.onclick = function() { window.openZoomPreview(dIndex, displayList); };
        wrapper.appendChild(div);

        // Bouton Télécharger (Plus petit, décalage réduit)
        if(isImage) { 
            let dlBtn = document.createElement('div'); dlBtn.innerHTML = '⬇️';
            dlBtn.style.cssText = 'position:absolute; top:-5px; left:-5px; background:#222; border-radius:50%; width:20px; height:20px; display:flex; justify-content:center; align-items:center; font-size:10px; cursor:pointer; border:1.5px solid #fff; z-index:5;';
            dlBtn.onclick = function(e) {
                e.stopPropagation(); let a = document.createElement('a'); a.href = avObj.url; a.download = 'Avatar_' + Date.now() + '.jpg'; a.click();
            }; wrapper.appendChild(dlBtn);
        }

        // Bouton Supprimer (CROIX BLANCHE, Taille réduite, décalage réduit)
        let delBtn = document.createElement('div');
        delBtn.innerHTML = '✕';
        delBtn.style.cssText = 'position:absolute; top:-5px; right:-5px; background:#ff4444; color:white; border-radius:50%; width:20px; height:20px; display:flex; justify-content:center; align-items:center; font-size:12px; cursor:pointer; border:1.5px solid #fff; z-index:5; font-weight:bold;';
        delBtn.onclick = function(e) {
            e.stopPropagation();
            if(confirm("Effacer ce look ?")) {
                // 1. Reset de l'avatar actuel si supprimé
                if(avObj.url === player.avatar) {
                    player.avatar = window.mjLogoUrl || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + player.pseudo;
                    if(roomRef) roomRef.child('players/' + myUserID).update({avatar: player.avatar});
                }
                // 2. Suppression de l'historique réel
                window.avatarHistory = window.avatarHistory.filter(h => h.url !== avObj.url);
                firebase.database().ref('users_crm/' + myUserID).update({ 
                    avatar: player.avatar,
                    avatarHistory: window.avatarHistory 
                }).then(() => {
                    window.showAvatarHistory(); 
                    if (window.pendingSelfie) window.savePendingSelfie();
                });
            }
        };
        wrapper.appendChild(delBtn);
        grid.appendChild(wrapper);
    });
};

// 🚀 MOTEUR DU DIAPORAMA AVATAR
window.currentZoomIndex = 0;

window.currentZoomList = [];
window.openZoomPreview = function(index, listToUse) {
    const list = listToUse || window.currentZoomList;
    if (!list || list.length === 0) return;
    
    window.currentZoomIndex = index;
    window.currentZoomList = list;
    
    const avObj = list[index];
    const previewZone = document.getElementById('zoom-avatar-display');
    let isImage = avObj.url.includes('http') || avObj.url.includes('data:image');
    
    previewZone.innerHTML = isImage ? '<img src="' + avObj.url + '" style="width:100%; height:100%; object-fit:cover;">' : avObj.url;

    document.getElementById('btn-zoom-prev').style.visibility = (index > 0) ? 'visible' : 'hidden';
    document.getElementById('btn-zoom-next').style.visibility = (index < list.length - 1) ? 'visible' : 'hidden';

    document.getElementById('btn-zoom-equip').onclick = () => {
        document.getElementById('overlay-avatar-preview').style.display = 'none';
        player.avatar = avObj.url;
        const previewEl = document.getElementById('avatar-preview');
        if (previewEl) previewEl.innerHTML = previewZone.innerHTML;
        if (window.isDirectGallery) window.validateAvatarChoice();
        else window.hideClassicAvatarMenu();
    };

    const dlBtn = document.getElementById('btn-zoom-download');
    dlBtn.style.display = isImage ? 'block' : 'none';
    if (isImage) dlBtn.onclick = () => { let a = document.createElement('a'); a.href = avObj.url; a.download = 'Avatar_' + Date.now() + '.jpg'; a.click(); };

    const delBtn = document.getElementById('btn-zoom-delete');
    delBtn.style.display = 'block'; // Toujours supprimable
    delBtn.onclick = () => {
        if(confirm("Voulez-vous vraiment supprimer cet avatar de votre galerie ?")) {
            if(avObj.url === player.avatar) {
                player.avatar = window.mjLogoUrl || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + player.pseudo;
                if(roomRef) roomRef.child('players/' + myUserID).update({avatar: player.avatar});
            }
            window.avatarHistory = window.avatarHistory.filter(h => h.url !== avObj.url);
            
            // 🚀 FIX DIAPORAMA : On met à jour la liste affichée
            window.currentZoomList = window.currentZoomList.filter(h => h.url !== avObj.url);
            
            firebase.database().ref('users_crm/' + myUserID).update({ 
                avatar: player.avatar,
                avatarHistory: window.avatarHistory 
            }).then(() => {
                window.showAvatarHistory();
                
                // Si d'autres photos existent, on glisse intelligemment sur la suivante
                if (window.currentZoomList.length > 0) {
                    let newIndex = window.currentZoomIndex >= window.currentZoomList.length ? window.currentZoomList.length - 1 : window.currentZoomIndex;
                    window.openZoomPreview(newIndex, window.currentZoomList);
                } else {
                    // Plus aucune photo, on ferme
                    document.getElementById('overlay-avatar-preview').style.display = 'none';
                }
                
                if (window.pendingSelfie) window.savePendingSelfie();
            });
        }
    };

    document.getElementById('overlay-avatar-preview').style.display = 'flex';
};

window.navigateZoom = function(direction) {
    let newIndex = window.currentZoomIndex + direction;
    if (newIndex >= 0 && newIndex < window.currentZoomList.length) { window.openZoomPreview(newIndex); }
};


// --- PATCH V1.240 : VALIDATEUR D'AVATAR (Correction stricte) ---
window.validateAvatarChoice = function() {
    const choiceContainer = document.getElementById('avatar-choice-container');
    const expressActions = document.getElementById('avatar-express-actions');
    const previewEl = document.getElementById('avatar-preview');
    
    if (previewEl) {
        const img = previewEl.querySelector('img');
        if (img) {
            player.avatar = img.src; 
        } else if (previewEl.innerText.trim() !== "") {
            player.avatar = previewEl.innerText.trim(); 
        }
    }

    alert("✅ Ton nouvel avatar a bien été pris en compte !");

    if (typeof myUserID !== 'undefined' && myUserID && !myUserID.startsWith('u_') && player.avatar && typeof window.crmAvatar !== 'undefined' && player.avatar !== window.crmAvatar) {
        alert("ℹ️ Ton ancien avatar sera sauvegardé dans ta galerie. Tu pourras toujours y revenir plus tard.");
        if (expressActions) expressActions.style.display = 'none';
        if (choiceContainer) choiceContainer.style.display = 'block';
    } else {
        if (typeof isEditing !== 'undefined' && isEditing) {
            if (typeof logEvent === 'function') logEvent('SYSTEM', `✏️ ${player.pseudo} a changé son avatar`);
            if (typeof roomRef !== 'undefined' && roomRef) roomRef.child('players/' + myUserID).update({avatar: player.avatar}); 
            if (typeof finishEdit === 'function') finishEdit(true);
        } else {
            if (typeof window.handleModeRouting === 'function') {
                window.handleModeRouting();
            } else {
                navigateTo('step-mode');
            }
        }
    }
};

window.handleCRMFileUpload = function(input) {
    if(input.files[0]) { 
        compressImage(input.files[0], 300, function(base64) { 
            window.googleAvatar = base64; // On utilise la même variable pour stocker la photo
            
            // 🚀 NOUVEAU : On dessine l'image dans le cercle
            document.getElementById('reg-photo-text').style.display = 'none';
            const imgEl = document.getElementById('reg-photo-img');
            imgEl.src = base64;
            imgEl.style.display = 'block';
            document.getElementById('reg-photo-edit-badge').style.display = 'block';
            document.getElementById('reg-photo-preview').style.border = 'none';
            
            const statusEl = document.getElementById('reg-photo-status');
            statusEl.innerText = "✅ Photo prête !";
            statusEl.style.display = 'block';
        }); 
    }
};

function selectMode(mode) { 
    player.team = mode; player.teamIcon = ""; 
    if(isEditing) { 
        logEvent('SYSTEM', `🛡️ ${player.pseudo} a quitté son équipe pour passer en Solo`); // 🟢 CAPTEUR
        roomRef.child('players/' + myUserID).update({teamName: "Solo", teamIcon: "", isCaptain: false}); 
        finishEdit(true); 
    } else { 
        if(mode === 'Solo') showRecap(); else goToTeamAction(); 
    } 
}

function goToTeamAction() { navigateTo('step-team-action'); }

function goToTeamCreate() { 
    if(teamListRef && teamListCallback) { teamListRef.off('value', teamListCallback); }
    toggleCreateUI(true); navigateTo('step-team-create'); renderTeamCrestPicker(); 
} 

function goToTeamJoin() { navigateTo('step-team-join'); loadTeamsList(); }

function loadTeamsList() {
    if(teamListRef && teamListCallback) { teamListRef.off('value', teamListCallback); }
    teamListRef = roomRef.child('teams');
    teamListCallback = teamListRef.on('value', snap => {
        const list = document.getElementById('team-list'); list.innerHTML = ""; const teams = snap.val() || {}; let validTeamsCount = 0;
        for(let tName in teams) {
            const t = teams[tName]; if (t.banned === true || t.active === false) continue;
            validTeamsCount++; const div = document.createElement('div'); div.className = 'team-card';
            div.style.cssText = "background:rgba(255,255,255,0.1); padding:10px; border-radius:8px; display:flex; align-items:center; cursor:pointer;";
            div.innerHTML = `<img src="${t.icon}" style="width:30px;height:30px;margin-right:10px;object-fit:contain;"><b>${tName}</b>`;
            div.onclick = () => { joinTeam(tName, t.icon); }; list.appendChild(div);
        }
        if(validTeamsCount === 0) list.innerHTML = "<div style='text-align:center; color:#aaa; padding:10px;'>Aucune équipe disponible. Créez-en une !</div>";
    });
}

/* --- PATCH V1.178 CORRIGÉ : VERROUILLAGE ATOMIQUE (Anti-Doublon Capitaine) --- */
function joinTeam(name, icon) { 
    if(teamListRef && teamListCallback) { teamListRef.off('value', teamListCallback); }
    
    roomRef.child('teams/' + name + '/blacklist/' + myUserID).once('value', snap => {
        if (snap.exists()) {
            alert("🚫 Vous avez été expulsé de cette équipe.\nSeul le Capitaine ou l'Animateur peut vous réintégrer.");
            navigateTo('step-team-action');
            return;
        }
        
        player.team = name; player.teamIcon = icon; 
        const trueTime = Date.now() + serverTimeOffset;
        
        // On vérifie directement l'équipe pour voir si elle a déjà un capitaine
        roomRef.child('players').orderByChild('teamName').equalTo(name).once('value', snapPlayers => {
            let hasCaptain = false;
            snapPlayers.forEach(child => {
                const p = child.val();
                // Si on trouve un joueur actif qui est capitaine (et que ce n'est pas nous)
                if (p.active !== false && p.banned !== true && p.isCaptain === true && child.key !== myUserID) {
                    hasCaptain = true;
                }
            });
            
            // Fonction d'enregistrement final
            const executeJoin = (becomeCaptain) => {
                if(isEditing) { 
                    logEvent('SYSTEM', `🤝 ${player.pseudo} a rejoint l'équipe ${name}`); 
                    roomRef.child('players/' + myUserID).update({teamName: name, teamIcon: icon, joinTimestamp: trueTime, isCaptain: becomeCaptain}).then(() => { finishEdit(true); }); 
                } else if (isRecovering) {
                    logEvent('SYSTEM', `🤝 ${player.pseudo} a rejoint l'équipe ${name}`); 
                    roomRef.child('players/' + myUserID).update({teamName: name, teamIcon: icon, joinTimestamp: trueTime, isCaptain: becomeCaptain}).then(() => { isRecovering = false; finishEdit(false); }); 
                } else { 
                    isCaptain = becomeCaptain;
                    showRecap(); 
                }
            };

            // Si aucun capitaine n'a été trouvé, le joueur devient capitaine
            executeJoin(!hasCaptain);
        });
    });
}

function toggleCreateUI(show) { if(show) { document.getElementById('team-crest-choices').style.display = 'flex'; document.getElementById('team-crest-gallery').style.display = 'none'; document.getElementById('team-preview').style.display = 'none'; selectedTeamCrest = ""; } }
function showTeamGallery() { document.getElementById('team-crest-choices').style.display = 'none'; document.getElementById('team-crest-gallery').style.display = 'flex'; }
function handleTeamFileUpload(input) { if(input.files[0]) { compressImage(input.files[0], 300, function(base64) { selectedTeamCrest=base64; showTeamPreview(); }); } }

function renderTeamCrestPicker() { 
    const c = document.getElementById('team-icon-grid'); c.innerHTML=""; const seen = new Set(); 
    if(selectedTeamCrest && selectedTeamCrest.length > 0) { seen.add(selectedTeamCrest); createCrestItem(selectedTeamCrest, c); }
    if(roomLibrary) {
        const entries = Object.entries(roomLibrary);
        const recent = entries.filter(e => e[0].startsWith('-')); const old = entries.filter(e => !e[0].startsWith('-'));
        recent.sort((a, b) => a[0].localeCompare(b[0])).reverse();
        [...recent, ...old].forEach(entry => { if(!seen.has(entry[1])) { seen.add(entry[1]); createCrestItem(entry[1], c); } });
    }
    for(let i=0; i<30; i++) { const svg = createBlason(i); if(!seen.has(svg)) { seen.add(svg); createCrestItem(svg, c); } }
}

function createCrestItem(url, container) {
    const d = document.createElement('div'); 
    d.className='crest-item'; 
    if (url.startsWith('data:image/svg')) { d.innerHTML = `<img src="${url}" onerror="this.parentElement.style.display='none'">`; } 
    else { d.style.background = 'transparent'; d.innerHTML = `<img src="${url}" style="border-radius: 8px;" onerror="this.parentElement.style.display='none'">`; }
    d.onclick = () => { document.querySelectorAll('.crest-item').forEach(e=>e.classList.remove('selected')); d.classList.add('selected'); selectedTeamCrest=url; showTeamPreview(); };
    container.appendChild(d);
}

function showTeamPreview() { document.getElementById('team-crest-choices').style.display='none'; document.getElementById('team-crest-gallery').style.display='none'; document.getElementById('team-preview-img').src=selectedTeamCrest; document.getElementById('team-preview').style.display='flex'; }

/* --- PATCH V1.182 : SÉCURITÉ D'ENREGISTREMENT GALERIE MJ --- */
function createNewTeam() { 
    const name = document.getElementById('new-team-name').value.trim(); 
    // PATCH V1.194 : Vigile Anti-Crash BDD
	if(/[.#$\[\]/]/.test(name)) return alert("Les caractères suivants sont interdits : . # $ [ ] /");
    if(name.length < 2 || !selectedTeamCrest) return alert("Nom et blason requis."); 
    
    // On vérifie spécifiquement que c'est un "jpeg" (Upload personnalisé compressé)
    if (selectedTeamCrest.startsWith('data:image/jpeg')) {
        roomRef.child('library').push(selectedTeamCrest).then(() => { 
            logEvent('SYSTEM', `🛡️ Joueur ${player.pseudo} a créé l'équipe ${name}`); // 🟢 CAPTEUR
            roomRef.child('teams/'+name).set({icon: selectedTeamCrest}).then(()=>{ joinTeam(name, selectedTeamCrest); }); 
        });
    } else { 
        // Si c'est un SVG par défaut, on l'utilise juste sans l'ajouter à la galerie MJ
        logEvent('SYSTEM', `🛡️ Joueur ${player.pseudo} a créé l'équipe ${name}`); // 🟢 CAPTEUR
        roomRef.child('teams/'+name).set({icon: selectedTeamCrest}).then(()=>{ joinTeam(name, selectedTeamCrest); }); 
    }
}

// --- PATCH V1.263 : INTELLIGENCE DU MENU ---

function openSettings() { 
    const badge = document.getElementById('account-status-badge');
    const guestMenu = document.getElementById('guest-actions-menu'); 
    const editBtn = document.getElementById('btn-edit-profile');
    const secBtn = document.getElementById('btn-security-profile');
    const gallBtn = document.getElementById('btn-direct-gallery');
    
    // 🚀 PATCH V1.304 : ANTI-TRICHE (Désactivation des menus pendant une manche)
    const btnMode = document.getElementById('btn-change-mode');
    const btnManageTeam = document.getElementById('btn-manage-team');
    
    if (gameState !== 'waiting' && gameState !== 'awarded') {
        if (btnMode) {
            btnMode.disabled = true;
            btnMode.style.opacity = '0.4';
            btnMode.innerText = "🛡️ Mode bloqué (Manche en cours)";
        }
        if (btnManageTeam) {
            btnManageTeam.disabled = true;
            btnManageTeam.style.opacity = '0.4';
            btnManageTeam.innerText = "👑 Gestion bloquée (Manche en cours)";
        }
    } else {
        if (btnMode) {
            // 🚀 NOUVEAU : Grisage complet du bouton si 100% Solo
            if (typeof roomSettings !== 'undefined' && roomSettings.gameMode === 'solo_only') {
                btnMode.disabled = true;
                btnMode.style.opacity = '0.4';
                btnMode.innerText = "🛡️ Mode 100% Solo imposé";
            } else {
                btnMode.disabled = false;
                btnMode.style.opacity = '1';
                btnMode.innerText = "🛡️ Changer Mode (Solo/Team)";
            }
        }
        if (btnManageTeam) {
            btnManageTeam.disabled = false;
            btnManageTeam.style.opacity = '1';
            btnManageTeam.innerText = "👑 Gérer mon Équipe";
        }
    }

    if (badge) {
        if (myUserID && !myUserID.startsWith('u_')) {
            badge.innerHTML = "✅ COMPTE CONNECTÉ";
            badge.style.background = "rgba(39, 174, 96, 0.2)";
            badge.style.color = "var(--success)";
            badge.style.border = "1px solid var(--success)";
            if(guestMenu) guestMenu.style.display = "none";
            if(editBtn) editBtn.style.display = "block";
            if(gallBtn) gallBtn.style.display = "block"; 
            
            const user = firebase.auth().currentUser;
            if (user && user.providerData && user.providerData[0] && user.providerData[0].providerId === 'password') {
                if(secBtn) secBtn.style.display = "block";
            } else {
                if(secBtn) secBtn.style.display = "none";
            }
        } else {
            badge.innerHTML = "⚪ PROFIL INVITÉ (Non sauvegardé)";
            badge.style.background = "rgba(255, 255, 255, 0.1)";
            badge.style.color = "#bdc3c7";
            badge.style.border = "1px solid #bdc3c7";
            if(guestMenu) guestMenu.style.display = roomSettings.loginMode === 'quick' ? "none" : "flex";
            if(editBtn) editBtn.style.display = "none";
            if(secBtn) secBtn.style.display = "none";
            if(gallBtn) gallBtn.style.display = "none";
        }
    }
    document.getElementById('overlay-settings').style.display = 'flex'; 
}

// --- PATCH V1.252 : GESTION DE LA MODIFICATION DE PROFIL ---
window.openEditProfileModal = function() {
    if (!myUserID || myUserID.startsWith('u_')) return; // Sécurité

    // Récupération des données depuis Firebase
    firebase.database().ref('users_crm/' + myUserID).once('value').then(snap => {
        if(snap.exists()) {
            const data = snap.val();
            document.getElementById('edit-firstname').value = data.firstName || "";
            document.getElementById('edit-lastname').value = data.lastName || "";
            document.getElementById('edit-phone').value = data.phone || "";
            document.getElementById('edit-dob').value = data.dob || "";
            document.getElementById('edit-zip').value = data.zip || "";
            document.getElementById('edit-city').value = data.city || "";
            document.getElementById('edit-company').value = data.company || "";
            
            document.getElementById('overlay-settings').style.display = 'none';
            document.getElementById('overlay-edit-profile').style.display = 'flex';
        } else {
            alert("Impossible de charger ton profil.");
        }
    }).catch(e => console.error("Erreur chargement profil", e));
};

window.saveEditedProfile = function() {
    if (!myUserID || myUserID.startsWith('u_')) return;

    const fName = document.getElementById('edit-firstname').value.trim();
    const lName = document.getElementById('edit-lastname').value.trim();
    const dob = document.getElementById('edit-dob').value;
    const zip = document.getElementById('edit-zip').value.trim();
    const city = document.getElementById('edit-city').value.trim();

    if (!fName || !lName || !dob || !zip || !city) {
        alert("Veuillez remplir tous les champs obligatoires (*).");
        return;
    }

    if (!window.isValidDate(dob)) {
        alert("La date de naissance doit être au format valide JJ/MM/AAAA.");
        return;
    }

    // Rassemblement des nouvelles données
    const updates = {
        firstName: fName,
        lastName: lName,
        phone: document.getElementById('edit-phone').value.trim(),
        dob: dob,
        zip: zip,
        city: city,
        company: document.getElementById('edit-company').value.trim()
    };

    // Envoi à Firebase
    firebase.database().ref('users_crm/' + myUserID).update(updates).then(() => {
        alert("✅ Tes informations ont bien été mises à jour !");
        document.getElementById('overlay-edit-profile').style.display = 'none';
        openSettings(); // Retour aux paramètres
    }).catch(e => {
        alert("Erreur lors de la sauvegarde.");
        console.error(e);
    });
};

window.openGalleryDirectly = function() {
    window.isDirectGallery = true; // 🚀 NOUVEAU : Mémoire du routage pour le bouton Retour
    document.getElementById('overlay-settings').style.display = 'none';
    navigateTo('step-avatar');
    setTimeout(() => {
        document.getElementById('avatar-express-actions').style.display = 'none';
        window.showAvatarHistory(); 
    }, 50);
};

window.closeHistoryMenu = function() {
    if (window.isDirectGallery) {
        window.isDirectGallery = false;
        document.querySelectorAll('.step-screen').forEach(s => s.classList.remove('active'));
        navigateTo('step-game', false);
        openSettings(); // Retour propre au menu !
    } else {
        window.hideClassicAvatarMenu();
    }
};

// --- PATCH V1.253 : GESTION SÉCURITÉ ---
window.openSecurityModal = function() {
    const user = firebase.auth().currentUser;
    if(!user) return;
    document.getElementById('sec-current-email').value = user.email;
    document.getElementById('sec-current-pwd').value = "";
    document.getElementById('sec-new-email').value = "";
    document.getElementById('sec-new-pwd').value = "";
    document.getElementById('sec-new-pwd-confirm').value = "";
    document.getElementById('sec-pwd-rules').style.display = 'none';

    document.getElementById('overlay-settings').style.display = 'none';
    document.getElementById('overlay-security-profile').style.display = 'flex';
};

window.checkSecPasswordMatch = function() {
    var p1 = document.getElementById('sec-new-pwd').value;
    var p2 = document.getElementById('sec-new-pwd-confirm').value;
    var matchEl = document.getElementById('sec-rule-match');
    var rulesZone = document.getElementById('sec-pwd-rules');
    var btnSave = document.getElementById('btn-save-security');
    
    // Affichage de la boîte si on commence à taper un nouveau mot de passe
    if(p1.length > 0 || p2.length > 0) {
        rulesZone.style.display = 'block';
    } else { 
        rulesZone.style.display = 'none'; 
        // 🚀 FIX : Si le joueur change d'avis et efface le champ, on débloque le bouton
        if(btnSave) btnSave.disabled = false; 
        return; 
    }

    // A. Analyse de la correspondance
    let isMatch = false;
    matchEl.style.display = 'block';
    if(p1 === p2 && p1.length > 0) {
        matchEl.innerHTML = "✅ Les mots de passe correspondent";
        matchEl.style.color = "var(--success)";
        isMatch = true;
    } else {
        matchEl.innerHTML = "❌ Les mots de passe ne correspondent pas";
        matchEl.style.color = "#e74c3c";
    }

    // B. Analyse de la sécurité (Rouge/Vert)
    const rules = [
        { id: 'sec-rule-len', test: p1.length >= 8, text: '8 caractères minimum' },
        { id: 'sec-rule-maj', test: /[A-Z]/.test(p1), text: '1 Majuscule' },
        { id: 'sec-rule-min', test: /[a-z]/.test(p1), text: '1 Minuscule' },
        { id: 'sec-rule-num', test: /[0-9]/.test(p1), text: '1 Chiffre' },
        { id: 'sec-rule-spe', test: /[^A-Za-z0-9]/.test(p1), text: '1 Caractère spécial' }
    ];
    
    let allValid = true;
    rules.forEach(r => {
        let el = document.getElementById(r.id);
        if (el) {
            if (r.test) {
                el.style.color = "var(--success)";
                el.innerHTML = "✅ " + r.text;
            } else {
                el.style.color = "#e74c3c";
                el.innerHTML = "❌ " + r.text;
                allValid = false;
            }
        }
    });
    
    // C. On bloque/débloque le bouton de sauvegarde
    if(btnSave) {
        btnSave.disabled = !(allValid && isMatch);
    }
};

window.saveSecurityProfile = function() {
    const btn = document.getElementById('btn-save-security');
    
    // 🚀 PROTECTION ANTI-BYPASS : On bloque la touche "Entrée" si les règles ne sont pas respectées
    if (btn && btn.disabled) return; 

    const currentPwd = document.getElementById('sec-current-pwd').value;
    const newEmail = document.getElementById('sec-new-email').value.trim();
    const newPwd = document.getElementById('sec-new-pwd').value;
    const newPwdConf = document.getElementById('sec-new-pwd-confirm').value;

    if(!currentPwd) { alert("Le mot de passe actuel est obligatoire."); return; }
    if(newPwd && newPwd !== newPwdConf) { alert("Les nouveaux mots de passe ne correspondent pas."); return; }
    
    btn.innerText = "⏳ Validation..."; btn.disabled = true;
    const user = firebase.auth().currentUser;
    
    // 1. RÉ-AUTHENTIFICATION
    const credential = firebase.auth.EmailAuthProvider.credential(user.email, currentPwd);
    user.reauthenticateWithCredential(credential).then(() => {
        // Création d'un tableau de promesses
        let promises = [];
        
        // 2A. Mise à jour de l'Email (si modifié)
        if (newEmail && newEmail !== user.email) {
            promises.push(user.updateEmail(newEmail).then(() => {
                // Mise à jour vitale dans la base CRM
                return firebase.database().ref('users_crm/' + myUserID).update({ email: newEmail });
            }));
        }
        
        // 2B. Mise à jour du Mot de passe (si demandé)
        if (newPwd) { promises.push(user.updatePassword(newPwd)); }

        if (promises.length === 0) {
            alert("Aucune modification demandée.");
            btn.innerText = "Valider"; btn.disabled = false;
            return;
        }

        // Exécution des mises à jour
        Promise.all(promises).then(() => {
            alert("✅ Tes informations de sécurité ont été mises à jour !");
            document.getElementById('overlay-security-profile').style.display = 'none';
            openSettings();
        }).catch((error) => {
            alert("Erreur lors de la mise à jour : " + error.message);
        }).finally(() => {
            btn.innerText = "Valider"; btn.disabled = false;
        });

    }).catch((error) => {
        btn.innerText = "Valider"; btn.disabled = false;
        if(error.code === 'auth/wrong-password') alert("Le mot de passe actuel est incorrect.");
        else alert("Erreur d'authentification : " + error.message);
    });
};

// API Code Postal pour l'édition
window.fetchCityFromZipEdit = function(zipcode) {
    if (zipcode.length >= 5) {
        fetch('https://geo.api.gouv.fr/communes?codePostal=' + zipcode + '&fields=nom&format=json&geometry=centre')
        .then(r => r.json())
        .then(data => {
            if (data && data.length > 0) document.getElementById('edit-city').value = data[0].nom;
        }).catch(e => console.error(e));
    }
};

function confirmQuit() {
    const isQuick = (typeof roomSettings !== 'undefined' && roomSettings && roomSettings.loginMode === 'quick');
    const bSave = document.getElementById('btn-quit-save');
    const bChange = document.getElementById('btn-quit-change');
    const bExit = document.getElementById('btn-quit-exit');
    const bQuick = document.getElementById('btn-quit-quick');
    const sub = document.getElementById('quit-subtitle');
    if (bSave) bSave.style.display = isQuick ? 'none' : 'block';
    if (bChange) bChange.style.display = isQuick ? 'none' : 'block';
    if (bExit) bExit.style.display = isQuick ? 'none' : 'block';
    if (bQuick) bQuick.style.display = isQuick ? 'block' : 'none';
    if (sub) sub.innerText = isQuick ? "Confirmes-tu vouloir quitter la partie ?" : "Que veux-tu faire ?";
    document.getElementById('overlay-quit').style.display = 'flex';
}
function editStep(stepId) { isEditing = true; document.getElementById('overlay-settings').style.display = 'none'; if(stepId === 'step-pseudo') document.getElementById('input-pseudo').value = player.pseudo; navigateTo(stepId); }

function finishEdit(stayInMenu = false) { 
    localStorage.setItem('presta_player_session', JSON.stringify(player));
    localStorage.setItem('buzz_lastProfile', JSON.stringify({pseudo: player.pseudo, avatar: player.avatar}));
    updateGameHeader();
    if(roomRef && myUserID) roomRef.child('players/' + myUserID).update({active:true});
    if(stayInMenu) { document.querySelectorAll('.step-screen').forEach(s => s.classList.remove('active')); navigateTo('step-game', false); document.getElementById('overlay-settings').style.display = 'flex'; } 
    else { isEditing = false; document.getElementById('overlay-settings').style.display = 'none'; navigateTo('step-game', false); }
}

function showRecap() {
    navigateTo('step-recap'); document.getElementById('recap-name').innerText = player.pseudo; const avDiv = document.getElementById('recap-avatar');
    if(player.avatar.length > 20) avDiv.innerHTML = `<img src="${player.avatar}" style="width:100px; height:100px; border-radius:50%; object-fit:cover;">`; else avDiv.innerText = player.avatar;
    document.getElementById('recap-team').innerHTML = (player.team === 'Solo') ? "Mode Solo" : `Équipe : <b>${player.team}</b>`;
    // Activation du tutoriel spécial Capitaine
    const tutCap = document.getElementById('tutorial-captain-block');
    if(tutCap) tutCap.style.display = (isCaptain && player.team !== "Solo") ? "flex" : "none";
}
