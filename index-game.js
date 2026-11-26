/* ============================================================================
 * index-game.js — Buzzer Temps Réel, Anti-Latence, Gestion Capitaine & Podium
 * Application Joueurs - Buz'Ta Puce (v1.315)
 * ============================================================================ */

function launchGame(isReconnect = false) {
    // 🚀 SÉCURITÉ : Blocage au lancement si le MJ a exigé les équipes
    if (player.team === "Solo" && typeof roomSettings !== 'undefined' && roomSettings.gameMode === 'team_only') {
        alert("⚠️ L'animateur exige des équipes pour la suite !\nCrée ou rejoins un clan pour retourner au buzzer.");
        document.getElementById('overlay-settings').style.display = 'none';
        goToTeamAction();
        return;
    }
    
    if(!isReconnect) {
        const trueTime = Date.now() + serverTimeOffset;
        let becomeCaptain = isCaptain;
        logEvent('SYSTEM', `📥 ${player.pseudo} a rejoint la partie (${player.team})`); // 🟢 CAPTEUR

        // 🛡️ SÉCURITÉ : On vérifie si un score existe déjà pour ce joueur sur le serveur
        roomRef.child('players/' + myUserID).once('value', snap => {
            const existingData = snap.val();
            
            // On récupère les points s'ils existent, sinon on initialise à 0
            const currentPoints = (existingData && existingData.pts !== undefined) ? existingData.pts : 0;
            player.pts = currentPoints;

            roomRef.child('players/' + myUserID).set({ 
                name: player.pseudo, 
                pts: currentPoints, // Correction : On utilise le score récupéré au lieu de forcer 0
                avatar: player.avatar, 
                teamName: player.team, 
                teamIcon: player.teamIcon, 
                active: true, 
                banned: false, 
                joinTimestamp: trueTime, 
                isCaptain: becomeCaptain 
            }).then(() => {
                if (becomeCaptain && player.team !== "Solo") {
                    alert(`👑 Bonne nouvelle ! Vous avez été promu Capitaine de l'équipe ${player.team} !\n\n💡 NOUVEAU POUVOIR : Cliquez sur la couronne 👑 en haut de l'écran pour gérer votre équipe.`);
                }
            });

            localStorage.setItem('presta_player_session', JSON.stringify(player)); 
            localStorage.setItem('buzz_lastProfile', JSON.stringify({pseudo: player.pseudo, avatar: player.avatar}));
            
            // On lance l'interface une fois que les données sont sécurisées
            updateGameHeader(); 
            navigateTo('step-game'); 
            requestWakeLock(); 
            startBuzzer();
        });
    } else {
        // Cas d'un retour direct (bouton "Retourner au buzzer")
        updateGameHeader(); 
        navigateTo('step-game'); 
        requestWakeLock(); 
        startBuzzer();
    }
}

function updateGameHeader() {
    const miniAv = document.getElementById('game-avatar');
    if(player.avatar.length > 20) miniAv.innerHTML = `<img src="${player.avatar}" style="width:100%; height:100%; object-fit:cover;">`; else miniAv.innerText = player.avatar;
    
    // 🚀 PATCH : Carton Jaune seul à côté du pseudo (La couronne est partie en haut à droite)
    let warnHtml = player.hasBeenWarned ? " <span style='font-size:1rem; margin-left:5px; filter:drop-shadow(0 0 2px red);' title='Avertissement reçu'>🟨</span>" : "";
    document.getElementById('game-pseudo').innerHTML = player.pseudo + warnHtml;
    
    const teamEl = document.getElementById('game-team'); const badgeEl = document.getElementById('team-badge'); const buzzerBg = document.getElementById('buzzer-bg');
    let bgImg = player.avatar;
    if (player.team !== "Solo") { 
        teamEl.innerText = player.team; teamEl.style.display = "block"; 
        if (player.teamIcon) { badgeEl.src = player.teamIcon; badgeEl.style.display = "block"; if(player.teamIcon.length > 20) bgImg = player.teamIcon; } 
    } else { 
        teamEl.innerText = "Solo"; 
        // 🚀 NOUVEAU : On masque "Solo" si on est en mode "solo_only" imposé
        teamEl.style.display = (typeof roomSettings !== 'undefined' && roomSettings.gameMode === 'solo_only') ? "none" : "block"; 
        badgeEl.style.display = "none"; 
    }
    if(bgImg.length > 20) { buzzerBg.src = bgImg; buzzerBg.style.display = "block"; } else { buzzerBg.style.display = "none"; }
    
    const btnManage = document.getElementById('btn-manage-team');
    if(btnManage) btnManage.style.display = (isCaptain && player.team !== "Solo") ? "block" : "none";
    
    // 🚀 NOUVEAU : Affichage de la couronne en haut à droite à côté de la roue dentée
    const btnHeaderCaptain = document.getElementById('btn-header-captain');
    if(btnHeaderCaptain) btnHeaderCaptain.style.display = (isCaptain && player.team !== "Solo") ? "flex" : "none";
}

// --- GESTION ÉQUIPE (CAPITAINE) TEMPS RÉEL + RECHERCHE UNIFIÉE ---

function openTeamManagement() {
    document.getElementById('overlay-settings').style.display = 'none';
    document.getElementById('manage-team-name').value = player.team;
    
    const searchInput = document.getElementById('team-live-search');
    searchInput.value = '';
    document.getElementById('clear-team-search').style.display = 'none';
    
    setTeamFilter('actifs');
    document.getElementById('overlay-manage-team').style.display = 'flex';
    
    if(manageTeamRef) manageTeamRef.off('value', manageTeamCallback);
    if(blacklistRef) blacklistRef.off('value', blacklistCallback);
    
    manageTeamRef = roomRef.child('players').orderByChild('teamName').equalTo(player.team);
    manageTeamCallback = manageTeamRef.on('value', snap => {
        teamMembersData = [];
        snap.forEach(child => { if(child.val().active !== false) teamMembersData.push({id: child.key, ...child.val()}); });
        renderTeamMembers();
    });
    
    blacklistRef = roomRef.child('teams/' + player.team + '/blacklist');
    blacklistCallback = blacklistRef.on('value', snap => {
        teamBlacklistData = [];
        snap.forEach(child => { teamBlacklistData.push({ id: child.key, ...child.val() }); });
        renderTeamMembers();
    });
}

function closeTeamManagement() {
    if(manageTeamRef) manageTeamRef.off('value', manageTeamCallback);
    if(blacklistRef) blacklistRef.off('value', blacklistCallback);
    manageTeamRef = null; blacklistRef = null;
    document.getElementById('overlay-manage-team').style.display = 'none';
}

function setTeamFilter(filter) {
    currentTeamFilter = filter;
    document.getElementById('pill-actifs').style.borderColor = (filter === 'actifs') ? 'var(--success)' : 'var(--grey)';
    document.getElementById('pill-actifs').style.color = (filter === 'actifs') ? 'var(--success)' : 'var(--grey)';
    document.getElementById('pill-bloques').style.borderColor = (filter === 'bloques') ? 'var(--danger)' : 'var(--grey)';
    document.getElementById('pill-bloques').style.color = (filter === 'bloques') ? 'var(--danger)' : 'var(--grey)';
    renderTeamMembers();
}

function renderTeamMembers() {
    const list = document.getElementById('manage-team-members');
    list.innerHTML = "";
    const query = document.getElementById('team-live-search').value.toLowerCase().trim();
    
    let displayList = [];
    
    if (query.length > 0) {
        displayList = [
            ...teamMembersData.map(m => ({...m, isBlocked: false})), 
            ...teamBlacklistData.map(m => ({...m, isBlocked: true}))
        ];
        displayList = displayList.filter(m => m.name && m.name.toLowerCase().includes(query));
    } else {
        if (currentTeamFilter === 'actifs') {
            displayList = teamMembersData.map(m => ({...m, isBlocked: false}));
        } else {
            displayList = teamBlacklistData.map(m => ({...m, isBlocked: true}));
        }
    }
    
    if(displayList.length === 0) { 
        list.innerHTML = "<div style='color:#7f8c8d; font-style:italic; padding:10px;'>Aucun joueur trouvé.</div>"; 
        return; 
    }
    
    displayList.sort((a,b) => (a.joinTimestamp || 0) - (b.joinTimestamp || 0));
    
    displayList.forEach(m => {
        const div = document.createElement('div');
        div.style.cssText = "display:flex; align-items:center; background:rgba(255,255,255,0.05); padding:8px; border-radius:8px;";
        let av = (m.avatar && m.avatar.length > 20) ? `<img src="${m.avatar}" style="width:30px;height:30px;border-radius:50%;object-fit:cover;">` : `<span style="font-size:1.5rem;">${m.avatar}</span>`;
        
        let btnAction = "";
        let statusDot = m.isBlocked ? "🔴" : "🟢";
        
        if (m.id === myUserID) {
            btnAction = `<span style="color:#7f8c8d; font-size:0.8rem; margin-left:auto;">(Toi)</span>`;
        } else if (m.isBlocked) {
            btnAction = `<button onclick="pardonMember('${m.id}')" style="margin-left:auto; background:var(--success); border:none; color:white; border-radius:5px; padding:5px 10px; cursor:pointer; font-weight:bold;">🔄 Gracier</button>`;
        } else {
            btnAction = `<div style="margin-left:auto; display:flex; gap:5px;">
                            <button onclick="transferCaptaincyFromPhone('${m.id}', '${m.name.replace(/'/g, "\\'")}')" style="background:var(--gold); color:black; border:none; border-radius:5px; padding:5px 10px; cursor:pointer; font-weight:bold;" title="Céder le rôle de Capitaine">👑 Céder</button>
                            <button onclick="expelMember('${m.id}', '${m.name.replace(/'/g, "\\'")}', '${m.avatar}')" style="background:var(--danger); border:none; color:white; border-radius:5px; padding:5px 10px; cursor:pointer; font-weight:bold;" title="Expulser de l'équipe">✕</button>
                         </div>`;
        }
        
        div.innerHTML = `${statusDot} ${av} <b style="margin-left:10px; color:${m.isBlocked ? '#7f8c8d' : 'white'}; font-size:1rem;">${m.name}</b> ${btnAction}`;
        list.appendChild(div);
    });
}

/* --- PATCH V1.180 : CÉDER LE CAPITANAT DEPUIS LE TÉLÉPHONE --- */
function transferCaptaincyFromPhone(newUid, newName) {
    if(confirm(`Êtes-vous sûr de vouloir céder votre rôle de Capitaine à ${newName} ?\nVous redeviendrez un simple membre de l'équipe.`)) {
        let updates = {};
        const teamName = player.team;
        logEvent('SYSTEM', `👑 Capitaine ${player.pseudo} a cédé son rôle à ${newName}`); // 🟢 CAPTEUR
        updates[myUserID + '/isCaptain'] = false;
        updates[myUserID + '/captainMessage'] = `ℹ️ Vous n'êtes plus capitaine de l'équipe ${teamName}. ${newName} est le nouveau capitaine.`;
        updates[newUid + '/isCaptain'] = true;
        updates[newUid + '/captainMessage'] = `👑 ${player.pseudo} n'est plus capitaine. Vous êtes le nouveau capitaine de l'équipe ${teamName} !`;
        
        roomRef.child('players').update(updates).then(() => { closeTeamManagement(); });
    }
}

// PATCH V1.193 : Migration complète de l'équipe (Points, Joueurs, Nettoyage MJ)
function renameTeamFromManage() {
    const newName = document.getElementById('manage-team-name').value.trim();
    const oldName = player.team;
    // PATCH V1.194 : Vigile Anti-Crash BDD
	if(/[.#$\[\]/]/.test(newName)) return alert("Les caractères suivants sont interdits : . # $ [ ] /");
    if(newName.length < 2) return alert("Nom trop court.");
    if(newName === oldName) return alert("C'est déjà le nom de l'équipe.");
    
    // 1. On vérifie que le nouveau nom n'existe pas déjà
	roomRef.child('teams/' + newName).once('value', snapNew => {
        if(snapNew.exists()) return alert("Ce nom d'équipe est déjà pris.");
        
		// 2. On récupère TOUTES les données de l'ancienne équipe (pour ne pas perdre les points !)
        roomRef.child('teams/' + oldName).once('value', snapOld => {
            let teamData = snapOld.val() || { icon: player.teamIcon, pts: 0 };
            
			// 3. On crée la nouvelle équipe avec les données exactes
            roomRef.child('teams/' + newName).set(teamData).then(() => {
                logEvent('SYSTEM', `🛠️ Capitaine ${player.pseudo} a renommé l'équipe ${oldName} en ${newName}`); // 🟢 L'ULTIME CAPTEUR
                
				// 4. On déplace tous les joueurs vers ce nouveau nom
                roomRef.child('players').orderByChild('teamName').equalTo(oldName).once('value', snapPlayers => {
                    let updates = {};
                    snapPlayers.forEach(child => { updates[child.key + '/teamName'] = newName; });
                        
						// 5. On supprime l'ancienne équipe pour nettoyer le lobby MJ
                        roomRef.child('players').update(updates).then(() => {
                        roomRef.child('teams/' + oldName).remove().then(() => {
                            player.team = newName;
                            updateGameHeader(); 
                            
							// On cache le bouton de validation
							document.getElementById('btn-save-team-name').style.display = 'none';
                            alert("Équipe renommée avec succès !");
                        });
                    });
                });
            });
        });
    });
}

function openCrestEdit() {
    document.getElementById('edit-crest-choices').style.display = 'flex';
    document.getElementById('edit-crest-gallery').style.display = 'none';
    document.getElementById('overlay-crest-edit').style.display = 'flex';
}

function showEditTeamGallery() {
    document.getElementById('edit-crest-choices').style.display = 'none';
    document.getElementById('edit-crest-gallery').style.display = 'flex';
    const c = document.getElementById('edit-team-icon-grid');
    c.innerHTML = "";
    const seen = new Set(); 
    if(roomLibrary) {
        const entries = Object.entries(roomLibrary);
        const recent = entries.filter(e => e[0].startsWith('-')); const old = entries.filter(e => !e[0].startsWith('-'));
        recent.sort((a, b) => a[0].localeCompare(b[0])).reverse();
        [...recent, ...old].forEach(entry => { if(!seen.has(entry[1])) { seen.add(entry[1]); createEditCrestItem(entry[1], c); } });
    }
    for(let i=0; i<30; i++) { const svg = createBlason(i); if(!seen.has(svg)) { seen.add(svg); createEditCrestItem(svg, c); } }
}

function createEditCrestItem(url, container) {
    const d = document.createElement('div'); d.className='crest-item'; 
    if (url.startsWith('data:image/svg')) { d.innerHTML = `<img src="${url}" onerror="this.parentElement.style.display='none'">`; } else { d.style.background = 'transparent'; d.innerHTML = `<img src="${url}" style="border-radius: 8px;" onerror="this.parentElement.style.display='none'">`; }
    d.onclick = () => { saveNewCrest(url); };
    container.appendChild(d);
}

function handleEditTeamFileUpload(input) {
    if(input.files[0]) { compressImage(input.files[0], 300, function(base64) { 
        roomRef.child('library').push(base64).then(() => { saveNewCrest(base64); }); 
    }); }
}

function saveNewCrest(iconUrl) {
    logEvent('SYSTEM', `🛠️ Capitaine ${player.pseudo} a modifié le blason de l'équipe`); // 🟢 CAPTEUR
    roomRef.child('teams/'+player.team).update({icon: iconUrl}).then(() => {
        document.getElementById('overlay-crest-edit').style.display='none';
        alert("Blason mis à jour !");
    });
}

function expelMember(uid, name, avatar) {
    if(confirm(`Expulser ${name} de l'équipe ?\n\nIl sera ajouté à la liste noire et repassera en Solo.`)) {
        logEvent('PUNISH', `Capitaine ${player.pseudo} a expulsé ${name} de l'équipe`); // 🟢 CAPTEUR
        roomRef.child('teams/' + player.team + '/blacklist/' + uid).set({ name: name, avatar: avatar });
        roomRef.child('players/' + uid).update({ teamName: "Solo", teamIcon: "", isCaptain: false });
    }
}

function pardonMember(uid) {
    logEvent('SYSTEM', `Capitaine ${player.pseudo} a gracié un membre banni`); // 🟢 CAPTEUR
    roomRef.child('teams/' + player.team + '/blacklist/' + uid).remove();
}
// --- FIN GESTION ÉQUIPE ---

function monitorTeamChanges(teamName) {
    if (currentWatchedTeam === teamName) return; 
    if (activeTeamRef && activeTeamCallback) { activeTeamRef.off('value', activeTeamCallback); activeTeamRef = null; activeTeamCallback = null; }
    currentWatchedTeam = teamName;
    if (teamName && teamName !== "Solo") {
        activeTeamRef = roomRef.child('teams/' + teamName);
        activeTeamCallback = activeTeamRef.on('value', snap => {
            const tData = snap.val();
            if (tData && tData.icon && tData.icon !== player.teamIcon) {
                player.teamIcon = tData.icon; updateGameHeader();
                roomRef.child('players/' + myUserID).update({ teamIcon: tData.icon }); localStorage.setItem('presta_player_session', JSON.stringify(player));
            }
        });
    }
}

function checkWhyKickedAndShowModal(teamName) {
    kickedFromTeam = teamName; 
    monitorReinstatedTeam(teamName);
    roomRef.child('teams/' + teamName).once('value', snap => {
        const t = snap.val(); const msgEl = document.getElementById('kicked-msg');
        if (!t || t.banned) { msgEl.innerHTML = `L'animateur a banni l'équipe <b>${teamName}</b>.<br><br>S'il décide de la réhabiliter, tu auras la possibilité de la rejoindre à nouveau. Que veux-tu faire en attendant ?`; } 
        else if (t.active === false) { msgEl.innerHTML = `L'animateur a mis l'équipe <b>${teamName}</b> en pause.<br><br>Tu pourras la retrouver si elle est réactivée. Que veux-tu faire en attendant ?`; } 
        else { msgEl.innerHTML = `Le Capitaine (ou l'animateur) t'a retiré de l'équipe <b>${teamName}</b>.<br><br>Que veux-tu faire ?`; }
        document.getElementById('overlay-team-kicked').style.display = 'flex';
    });
}

function handleKickedChoice(choice) {
    document.getElementById('overlay-team-kicked').style.display = 'none';
    if (choice === 'solo') { 
        logEvent('SYSTEM', `🛡️ ${player.pseudo} accepte son expulsion et passe en Solo`); // 🟢 CAPTEUR
        player.team = "Solo"; player.teamIcon = ""; isCaptain = false; updateGameHeader(); 
        if(roomRef && myUserID) { roomRef.child('players/' + myUserID).update({ teamName: "Solo", teamIcon: "", isCaptain: false }); }
    } 
    else if (choice === 'change') { isRecovering = true; isCaptain = false; navigateTo('step-team-action'); }
}

// ... (Laisse la fonction monitorReinstatedTeam intacte) ...

function handleReinstatedChoice(choice) {
    document.getElementById('overlay-team-reinstated').style.display = 'none';
    if (choice === 'yes') { document.getElementById('overlay-team-kicked').style.display = 'none'; }
    if (choice === 'yes' && kickedFromTeam) {
        roomRef.child('teams/' + kickedFromTeam).once('value', snap => {
            const t = snap.val();
            if(t && t.active !== false && t.banned !== true) {
                logEvent('SYSTEM', `🤝 ${player.pseudo} a réintégré son équipe réhabilitée (${kickedFromTeam})`); // 🟢 CAPTEUR
                player.team = kickedFromTeam; player.teamIcon = t.icon || ""; updateGameHeader();
                roomRef.child('players/' + myUserID).update({ teamName: player.team, teamIcon: player.teamIcon });
                localStorage.setItem('presta_player_session', JSON.stringify(player));
                monitorTeamChanges(player.team);
                document.querySelectorAll('.step-screen').forEach(s => s.classList.remove('active'));
                navigateTo('step-game', false);
            }
            kickedFromTeam = ""; 
        });
    } else { kickedFromTeam = ""; }
}

function monitorReinstatedTeam(teamName) {
    if (reinstatedTeamRef && reinstatedTeamCallback) { reinstatedTeamRef.off('value', reinstatedTeamCallback); }
    reinstatedTeamRef = roomRef.child('teams/' + teamName);
    let hasSeenBannedState = false; 
    reinstatedTeamCallback = reinstatedTeamRef.on('value', snap => {
        const t = snap.val();
        if (!t) return;
        if (t.active === false || t.banned === true) { hasSeenBannedState = true; }
        if (hasSeenBannedState && t.active !== false && t.banned !== true) {
            document.getElementById('reinstated-msg').innerHTML = `L'équipe <b>${teamName}</b> a été réhabilitée par l'animateur !<br><br>Veux-tu la réintégrer ?`;
            document.getElementById('overlay-team-reinstated').style.display = 'flex';
            reinstatedTeamRef.off('value', reinstatedTeamCallback); reinstatedTeamRef = null; reinstatedTeamCallback = null;
        }
    });
}

function startBuzzer() {
    roomRef.child('buzzers').off(); roomRef.child('gameState').off(); roomRef.child('players/' + myUserID).off();
    
    roomRef.on('value', snap => { 
        if(!snap.exists() && !isExiting && !isRoomClosing) { handleExit("🛑 La partie a été clôturée.", true); } 
    });
    
    roomRef.child('players/' + myUserID).on('value', snap => { 
        if (isExiting || isRoomClosing) return; 
        const d = snap.val(); 
        if(!d) { if(roomRef) roomRef.off(); alert("Votre compte a été supprimé définitivement."); localStorage.clear(); window.location.href = (mjLink && mjLink.startsWith('http')) ? mjLink : "https://tapni.com/app/djcedrik"; return; }
        if(d.banned) { showBannedScreen(mjName, mjLink); return; }
        
        /* --- PATCH V1.179 : PAUSE INTENTIONNELLE DU MJ UNIQUEMENT --- */
        if(d.active === false && d.kickedByMj === true) { 
            if(roomRef) roomRef.off(); 
            alert(`⏸️ Vous avez été mis en pause par ${mjName}.\nVous pourrez vous reconnecter plus tard si l'animateur vous y autorise.`); 
            window.location.href = (mjLink && mjLink.startsWith('http')) ? mjLink : "https://tapni.com/app/djcedrik"; 
            return; 
        }
        if (d.pendingWarning === true) { document.getElementById('overlay-warning').style.display = 'flex'; }

        let profileChanged = false;
        if (d.name && d.name !== player.pseudo) { player.pseudo = d.name; profileChanged = true; }
        if (d.avatar && d.avatar !== player.avatar) { player.avatar = d.avatar; profileChanged = true; }
        
        // 🚀 NOUVEAU : Mémorisation du carton jaune côté joueur
        player.hasBeenWarned = d.hasBeenWarned === true;
        
        if (profileChanged) { localStorage.setItem('buzz_lastProfile', JSON.stringify({pseudo: player.pseudo, avatar: player.avatar})); localStorage.setItem('presta_player_session', JSON.stringify(player)); }

        /* --- PATCH V1.178 : RADAR DE CAPITANAT (Final) --- */
        const wasCaptain = isCaptain;
        isCaptain = d.isCaptain === true;

        const newTeamName = d.teamName || "Solo";
        const oldTeamName = player.team;
        
        if (oldTeamName !== "Solo" && newTeamName === "Solo") {
            // 🚀 ANTI-LATENCE : On attend 500ms pour être sûr de recevoir les nouvelles règles du MJ
            setTimeout(() => {
                // 🚀 BYPASS INTELLIGENT : Si le mode 100% Solo est imposé, pas de pop-up d'expulsion
                if (typeof roomSettings !== 'undefined' && roomSettings.gameMode === 'solo_only') {
                    player.team = "Solo";
                    player.teamIcon = "";
                    isCaptain = false;
                    updateGameHeader();
                    
                    // 🚀 CORRECTION : Fermeture d'urgence absolue de TOUS les menus d'équipe
                    document.getElementById('overlay-manage-team').style.display = 'none';
                    document.getElementById('overlay-crest-edit').style.display = 'none';
                    document.querySelectorAll('.step-screen').forEach(s => s.classList.remove('active'));
                    document.getElementById('step-game').classList.add('active');
                } else {
                    checkWhyKickedAndShowModal(oldTeamName);
                }
            }, 500);
        }
        
        /* --- PATCH V1.185 : ALERTE TUTORIEL CAPITAINE (SILENCE EN FIN DE JEU) --- */
        // Si le MJ a envoyé une phrase personnalisée (MJ -> Joueur), on l'affiche
        if (d.captainMessage) {
            let finalMsg = d.captainMessage;
            // On ajoute l'astuce de la couronne uniquement si le joueur VIENT de devenir capitaine
            if (!wasCaptain && isCaptain) {
                finalMsg += "\n\n💡 NOUVEAU POUVOIR : Vous pouvez maintenant cliquer sur la couronne 👑 en haut de l'écran pour gérer votre équipe !";
            }
            // On n'affiche le pop-up QUE si le jeu est encore en cours
            if (gameState !== 'endGame' && gameState !== 'closing') alert(finalMsg);
            
            // On efface le message de la BDD après lecture pour éviter les répétitions
            roomRef.child('players/' + myUserID + '/captainMessage').remove();
        } else {
            // Fallback automatique (Succession sans intervention du MJ)
            if (!wasCaptain && isCaptain && newTeamName !== "Solo" && !isExiting && !isRoomClosing && gameState !== 'endGame' && gameState !== 'closing') {
                alert(`👑 Bonne nouvelle ! Vous avez été promu Capitaine de l'équipe ${newTeamName} !\n\n💡 NOUVEAU POUVOIR : Cliquez sur la couronne 👑 en haut de l'écran pour gérer votre équipe.`);
            } else if (wasCaptain && !isCaptain && oldTeamName !== "Solo" && newTeamName === oldTeamName && !isExiting && !isRoomClosing && gameState !== 'endGame' && gameState !== 'closing') {
                alert(`ℹ️ Le rôle de Capitaine a été réattribué à un autre joueur de l'équipe.`);
            }
        }

        player.team = newTeamName; player.teamIcon = d.teamIcon || "";
        /* ------------------------------------------------ */
        
        updateGameHeader(); monitorTeamChanges(player.team); 
        document.getElementById('game-score').innerText = d.pts || 0; 
        
        const rowTeam = document.getElementById('row-team-score');
        if(player.team !== "Solo") { rowTeam.style.display = "flex"; document.getElementById('label-team-score').innerText = "Score " + player.team + " : "; } else { rowTeam.style.display = "none"; }
    });

    /* PATCH V1.180 : Détection et affichage du Capitaine */
    roomRef.child('players').on('value', snap => {
        if(player.team === "Solo") return;
        const all = snap.val() || {}; let total = 0;
        let currentCaptainName = "Inconnu";
        Object.values(all).forEach(p => { 
            if(p.teamName === player.team) {
                total += (p.pts || 0);
                if (p.isCaptain) currentCaptainName = p.name;
            } 
        });
        document.getElementById('val-team-score').innerText = total;
        
        const capDisplay = document.getElementById('team-captain-display');
        if(capDisplay) {
            if(isCaptain) {
                capDisplay.innerHTML = `<span style="color:var(--gold); font-weight:bold;">👑 Vous êtes le Capitaine de cette équipe</span>`;
            } else {
                capDisplay.innerHTML = `Capitaine de l'équipe : <b style="color:white;">${currentCaptainName}</b>`;
            }
        }
    });

    roomRef.child('gameState').on('value', snap => { 
        const st = snap.val(); 
        
        if (st && st.status === 'endGame') showEndGame(); 
        else if (st && st.status === 'closing') showClosingScreen(); 
        else { 
            const newStatus = st ? st.status : 'waiting';
            // 🟢 DÉMARRAGE DU CHRONO QUAND L'ÉCRAN DEVIENT VERT
            if (newStatus === 'ready' && gameState !== 'ready') {
                buzzerReadyTime = Date.now();
                // 🚀 PATCH V1.304 : ANTI-TRICHE (Expulsion automatique des menus)
                if (isEditing || document.getElementById('overlay-manage-team').style.display === 'flex') {
                    document.getElementById('overlay-manage-team').style.display = 'none';
                    finishEdit(false);
                    alert("⚠️ La manche vient de commencer, les modifications d'équipe sont verrouillées !");
                }
            } else if (newStatus !== 'ready') {
                buzzerReadyTime = 0;
            }
            gameState = newStatus; 
            document.getElementById('podium-zone').style.display = 'none'; 
            updateUI(); 
        } 
    });
    roomRef.child('buzzers').on('value', snap => {
        const val = snap.val(); currentBuzzer = val ? val.pseudo : null; currentBuzzerId = val ? val.id : null;
        
        // 🚀 PATCH V1.305 : Mémorisation de l'équipe du gagnant pour la synchro
        window.globalCurrentWinnerTeam = val ? (val.teamName || "Solo") : "Solo";
        
        if (val && (currentBuzzerId === myUserID || currentBuzzer === player.pseudo) && currentWinner !== player.pseudo) { 
            
            // 🚀 CORRECTION : On coupe net le son du buzzer classique pour éviter la cacophonie
            const sClick = document.getElementById('sound-click');
            if (sClick) {
                sClick.pause();
                sClick.currentTime = 0;
            }
            
            document.getElementById('sound-win').play().catch(()=>{}); 
            if(navigator.vibrate) navigator.vibrate([200, 100, 200]); 
        }
        currentWinner = val ? val.pseudo : null; updateUI();
    });
    
    // 🚀 PATCH V1.305 : GESTION DU BLOCAGE ÉQUIPE OU INDIVIDUEL CÔTÉ TÉLÉPHONE
    roomRef.child('blockedPlayers').on('value', snap => { 
        const blockedList = snap.val() || {};
        // Vérifie si MON pseudo est dans la liste rouge (soit seul, soit ajouté avec toute l'équipe)
        isBlocked = blockedList[player.pseudo] === true; 
        updateUI(); 
    });
}

function acknowledgeWarning() { 
    document.getElementById('overlay-warning').style.display = 'none'; 
    if (roomRef && myUserID) { 
        logEvent('SYSTEM', `⚠️ ${player.pseudo} a pris connaissance de son avertissement`); // 🟢 CAPTEUR
        roomRef.child('players/' + myUserID).update({ pendingWarning: null }); 
    } 
}

function handleExit(message, redirect) { if(roomRef) roomRef.off(); alert(message); localStorage.removeItem('presta_player_session'); if(redirect && mjLink && mjLink.startsWith('http')) { window.location.href = mjLink; } else { location.reload(); } }

function setInactiveAndAction(callback) { 
    if(roomRef && myUserID) { 
        logEvent('SYSTEM', `🚪 ${player.pseudo} a quitté volontairement la salle`); // 🟢 CAPTEUR
        roomRef.child('players/' + myUserID).update({ active: false }).then(() => { callback(); }).catch(() => { callback(); }); 
    } else { callback(); } 
}

function handleExitAction(action) {
    if (isCaptain && player.team !== "Solo" && action !== 'save' && gameState !== 'endGame' && gameState !== 'closing') {
        roomRef.child('players').orderByChild('teamName').equalTo(player.team).once('value', snap => {
            let members = [];
            snap.forEach(child => {
                const p = child.val();
                if(child.key !== myUserID && p.active !== false && p.banned !== true) {
                    members.push({id: child.key, ...p});
                }
            });
            
            if(members.length > 0) {
                members.sort((a,b) => (a.joinTimestamp || 0) - (b.joinTimestamp || 0));
                const successor = members[0];
                if(confirm(`⚠️ ATTENTION CAPITAINE !\n\nSi vous quittez, vous perdrez votre statut.\nC'est ${successor.name} qui prendra votre place en tant que nouveau chef.\n\nVoulez-vous vraiment quitter ?`)) {
                    logEvent('SYSTEM', `👑 Auto-transfert : ${successor.name} devient Capitaine suite au départ de ${player.pseudo}`); // 🟢 CAPTEUR
                    roomRef.child('players/' + successor.id).update({isCaptain: true}).then(() => {
                        roomRef.child('players/' + myUserID).update({isCaptain: false}).then(() => {
                            executeExitAction(action);
                        });
                    });
                }
            } else {
                executeExitAction(action);
            }
        });
        return;
    }
    executeExitAction(action);
}

function executeExitAction(action) {
    if(action === 'save') {
        if (myUserID && myUserID.startsWith('u_')) {
            document.getElementById('overlay-quit').style.display = 'none';
            window.openCRMModal();
            return;
        }
        if(confirm("✅ Ton profil est lié à ton compte ! Tant que l'animateur n'a pas fermé la salle, tu pourras revenir et récupérer ton score.\n\nVoulez-vous quitter ?")) {
            releaseWakeLock();
            isExiting = true;
            setInactiveAndAction(() => { window.location.href = (mjLink && mjLink.startsWith('http')) ? mjLink : "https://tapni.com/app/djcedrik"; });
        }
        return;
    }
    releaseWakeLock();
    if(action === 'quick_exit') {
        isExiting = true;
        setInactiveAndAction(() => {
            localStorage.removeItem('presta_player_session');
            localStorage.removeItem('buzz_lastRoom');
            window.location.href = (mjLink && mjLink.startsWith('http')) ? mjLink : "https://tapni.com/app/djcedrik";
        });
    } else if(action === 'change') {
        if(confirm("Quitter cette salle pour en rejoindre une autre ?\nVotre profil sera conservé.")) { isExiting = true; setInactiveAndAction(() => { localStorage.removeItem('presta_player_session'); localStorage.removeItem('buzz_lastRoom'); location.reload(); }); }
    } else if(action === 'exit') {
        if(confirm("⚠️ Tout effacer et quitter définitivement ?")) { isExiting = true; setInactiveAndAction(() => { localStorage.clear(); window.location.href = (mjLink && mjLink.startsWith('http')) ? mjLink : "https://tapni.com/app/djcedrik"; }); }
    }
}

function showClosingScreen() { 
    isRoomClosing = true; 
    document.getElementById('podium-zone').style.display = 'none'; 
    const isQuick = (typeof roomSettings !== 'undefined' && roomSettings && roomSettings.loginMode === 'quick');
    const saveBtn = document.getElementById('btn-closing-save');
    const leaveBtn = document.getElementById('btn-closing-leave');
    const msgEl = document.getElementById('closing-msg');
    if (isQuick) {
        if (saveBtn) saveBtn.style.display = 'none';
        if (msgEl) msgEl.innerHTML = `Merci d'avoir participé à la partie de <b>${mjName}</b> ! 🎉<br><br>Confirmes-tu vouloir quitter la salle ?`;
        if (leaveBtn) {
            leaveBtn.className = 'btn-main';
            leaveBtn.style.cssText = 'width:100%; background:linear-gradient(135deg, #ef4444, #b91c1c); color:white; border:none;';
            leaveBtn.innerText = '🚪 Quitter la partie';
        }
    } else {
        if (saveBtn) saveBtn.style.display = 'block';
        if (msgEl) msgEl.innerHTML = `L'animateur clôture la salle.<br><br>Veux-tu sauvegarder ton profil et ton score pour tes futures parties ?`;
        if (leaveBtn) {
            leaveBtn.className = 'settings-btn';
            leaveBtn.style.cssText = 'border: 1px solid var(--danger); color: var(--danger); text-align: center;';
            leaveBtn.innerText = '🚪 Quitter sans sauvegarder';
        }
    }
    document.getElementById('overlay-closing').style.display = 'flex'; 
}

function handleFinalSave() {
    if (myUserID && myUserID.startsWith('u_')) {
        document.getElementById('overlay-closing').style.display = 'none';
        window.openCRMModal();
        return;
    }
    alert("✅ Ton profil est déjà sauvegardé sur ton compte !");
    window.location.href = (mjLink && mjLink.startsWith('http')) ? mjLink : "https://tapni.com/app/djcedrik";
}
function handleFinalLeave() { localStorage.clear(); window.location.href = (mjLink && mjLink.startsWith('http')) ? mjLink : "https://tapni.com/app/djcedrik"; }

function handlePress(e) { 
    if(e.cancelable) e.preventDefault(); 
    
    // On bloque le clic uniquement si on est en jeu ET que ce n'est pas le moment des points/attente
    if(isBlocked || (currentWinner && gameState !== 'awarded' && gameState !== 'waiting')) return;  
    
    const btn = document.getElementById('btn-buzz'); 
    btn.classList.add('buzzer-pressed'); 
    if(navigator.vibrate) navigator.vibrate(50); 
    
    // Le joueur peut faire "mumuse" avec le son en mode attente/awarded
    if(gameState === 'waiting' || gameState === 'awarded') document.getElementById('sound-click').play().catch(()=>{}); 
    if(gameState === 'ready') onBuzzerClick(); 
}

function handleRelease(e) { if(e.cancelable) e.preventDefault(); document.getElementById('btn-buzz').classList.remove('buzzer-pressed'); }

function onBuzzerClick() { 
    if (gameState !== 'ready') return;
    
    // On bloque le bouton immédiatement en mode "VÉRIFICATION"
    document.getElementById('btn-buzz').classList.remove('ready');
    document.getElementById('label').innerText = "VÉRIFICATION...";
    
    // On envoie la tentative dans l'urne d'arbitrage
    roomRef.child('buzzAttempts/' + myUserID).set({
        id: myUserID,
        pseudo: player.pseudo,
        avatar: player.avatar,
        teamName: player.team,
        teamIcon: player.teamIcon,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    });
    
    document.getElementById('sound-click').play().catch(()=>{});
    
    // 🚀 CORRECTION : Calcul du temps de réaction avant de l'envoyer au MJ
    let reactionTime = Date.now() - buzzerReadyTime;
    logEvent('BUZZ_PLAYER', `⏱️ ${player.pseudo} a cliqué en ${reactionTime} ms`); // 🟢 CAPTEUR
    
    updateUI();
}

function updateUI() {
    const c = document.getElementById('btn-buzz'); const l = document.getElementById('label'); const msg = document.getElementById('status-msg'); const box = c.parentElement.parentElement; 
    
    box.className = "step-screen active"; 
    
    // 🚀 PATCH V1.305 : SYNCHRONISATION ÉQUIPE (Vérifie si un membre de MON équipe a gagné)
    let isMyTeamWinner = false;
    let teamWinnerName = "";
    if (currentWinner && window.globalCurrentWinnerTeam && window.globalCurrentWinnerTeam !== "Solo" && window.globalCurrentWinnerTeam === player.team) {
        isMyTeamWinner = true;
        teamWinnerName = currentWinner;
    }
    
    // 0️⃣ PRIORITÉ ABSOLUE : Fin de manche (Branche A). Tout le monde repasse en "ATTENDEZ".
    if (gameState === 'waiting') {
        l.innerText = "ATTENDEZ"; msg.innerText = "L'animateur va lancer le son..."; 
    // 1️⃣ Si la main est libre, on ouvre les buzzers (sauf pour les bloqués)
    } else if (gameState === 'ready') { 
        if (isBlocked) { 
            box.classList.add('blocked'); l.innerText = "BLOQUÉ"; msg.innerText = "Attends la prochaine manche."; 
        } else { 
            box.classList.add('ready'); l.innerText = "BUZZEZ !"; msg.innerText = "La main est libre !"; 
        } 
    // 2️⃣ Si l'arbitre analyse un buzz simultané
    } else if (gameState === 'processing') {
        box.classList.add('blocked'); l.innerText = "VÉRIFICATION"; msg.innerText = "L'arbitre vérifie..."; 
    // 3️⃣ Si un joueur a la main
    } else if (gameState === 'taken' && currentWinner) { 
        if(currentWinner === player.pseudo) { 
            box.classList.add('main-prise'); l.innerText = "C'EST À TOI !"; msg.innerText = "🎤 Donne ta réponse !"; 
        } else if (isMyTeamWinner) {
            box.classList.add('main-prise'); l.innerText = "BIEN JOUÉ !"; msg.innerText = `🎤 ${teamWinnerName} a pris la main !`; 
        } else { 
            box.classList.add('blocked'); l.innerText = "OCCUPÉ"; msg.innerText = `${currentWinner} a la main.`; 
        } 
    // 4️⃣ Sécurité si le joueur est bloqué dans un autre état
    } else if (isBlocked) { 
        box.classList.add('blocked'); l.innerText = "BLOQUÉ"; msg.innerText = "Attends la prochaine manche."; 
    // 5️⃣ État par défaut
    } else { 
        l.innerText = "ATTENDEZ"; msg.innerText = "L'animateur va lancer le son..."; 
    }
}

function showQR() { const url = window.location.href.split('?')[0] + "?room=" + roomID; document.getElementById('qrcode-display').innerHTML = ""; new QRCode(document.getElementById("qrcode-display"), { text: url, width: 200, height: 200 }); document.getElementById('qr-room-code').innerText = roomID; document.getElementById('overlay-qr').style.display = 'flex'; }
function showShare() { const url = window.location.href.split('?')[0] + "?room=" + roomID; if (navigator.share) { navigator.share({ title: 'Blind Test - Presta\'Puce', text: `Rejoins ma partie de Blind Test ! Code Salle: ${roomID}`, url: url }).catch(console.error); } else { prompt("Copie ce lien pour le partager :", url); } }

/* --- PATCH V1.186 : SÉPARATION DES SCORES BANNIS --- */
function showEndGame() {
    roomRef.once('value', snap => {
        const data = snap.val() || {};
        const allPlayers = data.players || {};
        const allTeams = data.teams || {};
        let rankingMap = new Map();
        
        Object.values(allPlayers).forEach(p => {
            const tName = p.teamName && p.teamName !== "Solo" ? p.teamName : "Solo";
            if (tName !== "Solo") {
                if (!rankingMap.has("team-" + tName)) rankingMap.set("team-" + tName, { name: tName, pts: 0, isTeam: true });
                if (!p.banned) rankingMap.get("team-" + tName).pts += (p.pts || 0);
            } else {
                if (!p.banned) rankingMap.set("solo-" + p.name, { name: p.name, pts: p.pts || 0, isTeam: false });
            }
        });

        Object.keys(allTeams).forEach(t => {
            if (rankingMap.has("team-" + t)) {
                rankingMap.get("team-" + t).pts += (allTeams[t].bonus || 0);
            }
        });

        const sorted = Array.from(rankingMap.values()).sort((a,b) => b.pts - a.pts);
        
        let myEntryName = player.team !== "Solo" ? player.team : player.pseudo;
        let myEntry = sorted.find(x => x.name === myEntryName && x.isTeam === (player.team !== "Solo"));
        
        let rank = myEntry ? sorted.findIndex(x => x === myEntry) + 1 : 0;
        let pts = myEntry ? myEntry.pts : 0;
        let displayName = player.team !== "Solo" ? `Équipe ${player.team}` : player.pseudo;
        
        renderPodiumUI(rank, displayName, pts);
    });
}

function renderPodiumUI(rank, name, pts) {
    let html = ""; 
    if(rank === 1) html = `<img src="https://cdn-icons-png.flaticon.com/512/2583/2583344.png" class="trophy-img champion-trophy"><h1 style="color:var(--gold);">CHAMPION ! 🏆</h1><p>${name} - ${pts} pts</p>`; 
    else if(rank === 2) html = `<img src="https://cdn-icons-png.flaticon.com/512/2583/2583319.png" class="trophy-img"><h1 style="color:#bdc3c7;">VICE-CHAMPION 🥈</h1><p>${name} - ${pts} pts</p>`; 
    else if(rank === 3) html = `<img src="https://cdn-icons-png.flaticon.com/512/2583/2583434.png" class="trophy-img"><h1 style="color:#cd7f32;">3ème PLACE 🥉</h1><p>${name} - ${pts} pts</p>`; 
    else html = `<h1>${rank}ème PLACE</h1><p>${name} - ${pts} pts</p>`; 
    
    document.getElementById('podium-content').innerHTML = html; 
    document.getElementById('podium-zone').style.display = 'flex'; 
    
    if (rank === 1) {
        document.getElementById('sound-applause').play().catch(()=>{}); 
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, zIndex: 6000 });
    }
}
