/* ============================================================================
 * mj-room.js — Création de Salle, Cockpit Régie, Synchro Firebase & Rendu Lobbies
 * Console MJ Pro - Buz'Ta Puce (v1.303)
 * ============================================================================ */

function askMjNameAndCreate() { 
    // 🚀 Enregistre si la phase 0 était en cours pour enchaîner sans coupure
    let wasTutoPhase0 = (typeof window.isTutoRunning !== 'undefined' && window.isTutoRunning && tutoCurrentPhase === 0);
    if (wasTutoPhase0) document.querySelectorAll('.tuto-highlight').forEach(el => el.classList.remove('tuto-highlight'));
    
    document.getElementById('new-room-mj').value = mjProfileData.prenom || "MJ"; 
    document.getElementById('new-room-name').value = ""; 
    
    const modeSelect = document.getElementById('new-room-mode');
    if (modeSelect) {
        modeSelect.value = 'mixed';
        // 🚀 PATCH TUTO : On grise les autres options si le tuto tourne
        if (window.isTutoRunning) {
            Array.from(modeSelect.options).forEach(opt => {
                if (opt.value !== 'mixed') opt.disabled = true;
            });
        } else {
            Array.from(modeSelect.options).forEach(opt => opt.disabled = false);
        }
    }
    if (typeof toggleTeamLockUI === 'function') toggleTeamLockUI('new');
    
    document.getElementById('modal-create-room').style.display = 'flex';
    setTimeout(() => {
        document.getElementById('new-room-name').focus();
        // 🚀 DÉCLENCHE LA PHASE 1 DIRECTEMENT SI ON ÉTAIT DANS LE TUTO
        if (wasTutoPhase0 && typeof window.startTuto === 'function') window.startTuto(1, true);
    }, 100); 
}

function confirmCreateRoom() { 
    const mjName = document.getElementById('new-room-mj').value.trim() || "Animateur"; 
    const eventName = document.getElementById('new-room-name').value.trim(); // 🚀 On retire la valeur par défaut
    
    if(!eventName) {
        return alert("⚠️ Le nom de l'événement est obligatoire pour créer une salle.");
    }
    
    if(/[.#$\[\]\/]/.test(mjName) || /[.#$\[\]\/]/.test(eventName)) {
        return alert("Les caractères suivants sont interdits : . # $ [ ] /");
    }
    
    const d = new Date(); 
    const dateStr = d.getFullYear().toString() + (d.getMonth()+1).toString().padStart(2,'0') + d.getDate().toString().padStart(2,'0');
    const randomSuffix = Math.floor(Math.random() * 999).toString().padStart(3,'0');
    const newRoomId = dateStr + randomSuffix; 
    
    // 🚀 PATCH TUTO : On détermine les valeurs réelles, mais on force le mode mixte si le Tuto est actif
    let finalGameMode = document.getElementById('new-room-mode') ? document.getElementById('new-room-mode').value : 'mixed';
    if (window.isTutoRunning) finalGameMode = 'mixed';

    const initialData = { 
        mj: auth.currentUser.uid, 
        mjName: mjName,
        mjLogo: mjProfileData.customLogo || "",
        mjLink: mjProfileData.customLink || "",
        isGuestRoom: mjProfileData.isGuest === true,
        eventName: eventName,
        createdAt: firebase.database.ServerValue.TIMESTAMP,
        isArchived: false,
        isPaused: false,
        gameState: { status: 'waiting' },
        settings: {
            loginMode: document.getElementById('new-room-login') ? document.getElementById('new-room-login').value : 'full',
            gameMode: finalGameMode,
            teamLock: document.getElementById('new-room-team-lock') ? document.getElementById('new-room-team-lock').value : 'individual',
            dayMode: false
        }
    };
    
    window.roomSettings = { ...initialData.settings };

    db.ref('rooms/' + newRoomId).set(initialData).then(() => { 
        document.getElementById('modal-create-room').style.display = 'none';
        
        // 🟢 CAPTEUR DE CRÉATION
        logEvent('SYSTEM', `Ouverture officielle de la salle : ${eventName}`);
        
        // Lancement propre avec la fonction native de ton fichier
        launchDashboard(newRoomId, mjName, eventName, false);
    }).catch(e => {
        alert("Erreur de création : " + e.message);
    }); 
}

function launchDashboard(id, mjName = null, eventName = null, isArchived = false) {
    roomID = id; buzzHistory = []; currentBuzzerId = null; currentPlayer = null;
    currentPlayerFilter = 'all'; currentMjTeamFilter = 'all';
    document.querySelectorAll('#player-filters button').forEach(btn => btn.classList.remove('active')); document.getElementById('filter-btn-all').classList.add('active'); 
    document.querySelectorAll('#mj-team-filters button').forEach(btn => btn.classList.remove('active')); document.getElementById('tfilter-btn-all').classList.add('active'); 
    if(document.getElementById('player-search')) document.getElementById('player-search').value = "";
    if(document.getElementById('mj-team-search')) document.getElementById('mj-team-search').value = "";
    
    const btnDel = document.getElementById('btn-delete-room');
    if (btnDel) {
        btnDel.disabled = false;
        btnDel.classList.remove('holding');
        /* PATCH V1.220 : Conservation du style fin pour 'Détruire' au démarrage */
        btnDel.innerHTML = "<div>⚠️ Supprimer</div><small style=\"font-size:0.7rem; opacity:0.8; font-weight:normal;\">(Détruire)</small>";
        clearTimeout(holdTimer);
    }
    
    document.getElementById('screen-choice').style.display = "none"; 
    const dashboard = document.getElementById('screen-dashboard');
    dashboard.style.display = "block"; 
    document.getElementById('top-right-tools').style.display = "flex";
    document.getElementById('display-room').innerText = roomID;
    
    if (eventName) document.getElementById('display-event-name').innerText = eventName;
    if (mjName) document.getElementById('display-mj-name').innerText = "Animé par " + mjName;

    roomRef = db.ref('rooms/' + id);

    if(isArchived) {
        dashboard.classList.add('readonly-mode');
        document.getElementById('readonly-banner').style.display = 'block';
    } else {
        dashboard.classList.remove('readonly-mode');
        document.getElementById('readonly-banner').style.display = 'none';
        
        let activeRoomData = { id: roomID, status: 'open', timestamp: firebase.database.ServerValue.TIMESTAMP };
        if (mjName) activeRoomData.mjName = mjName;
        if (eventName) activeRoomData.eventName = eventName;
        
        const publicRef = db.ref('activeRooms/' + roomID);
        
        /* --- PATCH V1.221 : DÉFIBRILLATEUR ANTI-MICRO-COUPURES (Mise à jour UI Épurée) --- */
        db.ref('.info/connected').off('value'); 
        db.ref('.info/connected').on('value', snap => {
            const statusDot = document.getElementById('network-status-dot');
            const statusContainer = document.getElementById('network-status-container');
            
            if (snap.val() === true) {
                if(statusDot) { statusDot.innerText = '🟢'; statusDot.classList.remove('pulse-alert'); }
                if(statusContainer) { statusContainer.title = 'État de la connexion au serveur : En ligne'; }
                
                if (!document.getElementById('screen-dashboard').classList.contains('readonly-mode')) {
                    publicRef.set(activeRoomData);
                    publicRef.onDisconnect().remove();
                }
            } else {
                if(statusDot) { statusDot.innerText = '🔴'; statusDot.classList.add('pulse-alert'); }
                if(statusContainer) { statusContainer.title = 'État de la connexion au serveur : Hors ligne'; }
            }
        });
    }

    if (!isArchived) {
        // PATCH V1.224 : Purge des buzzers fantômes au démarrage
        fullReset();
    }
    
    const defLogo = APP_CONFIG.LOGO_URL;
	try { roomRef.child('mjLogo').set(mjProfileData.customLogo && mjProfileData.customLogo !== APP_CONFIG.LOGO_BUZTAPUCE ? mjProfileData.customLogo : defLogo); } catch(e){}
	try { if(mjProfileData.customLink) roomRef.child('mjLink').set(mjProfileData.customLink); } catch(e){}
    try { roomRef.child('isGuestRoom').set(mjProfileData.isGuest === true); } catch(e){}
    try { if(mjProfileData.defaultBackground) roomRef.child('customBackground').set(mjProfileData.defaultBackground); } catch(e){}
    try { roomRef.child('showDefaultCrests').set(showDefaultCrests); } catch(e){}
    
    try { syncLibraryToRoom(); } catch(e){ console.error(e); }

    // 🚀 Enregistre si la phase 1 était en cours pour enchaîner
    let wasTutoPhase1 = (typeof window.isTutoRunning !== 'undefined' && window.isTutoRunning && tutoCurrentPhase === 1);
    if (wasTutoPhase1) document.querySelectorAll('.tuto-highlight').forEach(el => el.classList.remove('tuto-highlight'));

    try { initMJLogic(); } catch(e){ console.error(e); }
    try { initLibrarySync(); } catch(e){ console.error(e); }
    try { loadBgLibrary('dashboard'); } catch(e){ console.error(e); }
    try { openScoreBoard(); } catch(e){ console.error(e); }
    
    // 🚀 DÉCLENCHE LA PHASE 2 DIRECTEMENT SI ON VIENT DE LA PHASE 1
    setTimeout(() => {
        if (wasTutoPhase1 && typeof window.startTuto === 'function') window.startTuto(2, true);
    }, 1000);
}

/* --- PATCH V1.215 : BOUTON D'URGENCE MANUEL --- */
function forceRoomOpen() {
    if (window.isSandboxMode) {
        document.getElementById('network-status-dot').innerText = '🟢';
        document.getElementById('network-status-dot').classList.remove('pulse-alert');
        if (window.isTutoRunning && tutoCurrentPhase === 2 && tutoCurrentStep === 0) {
            window.nextTutoStep();
        }
        return;
    }
    if(!roomID || document.getElementById('screen-dashboard').classList.contains('readonly-mode')) {
        return alert("Action impossible : La salle est fermée ou archivée.");
    }
    
    const mjName = document.getElementById('display-mj-name').innerText.replace('Animé par ', '');
    const eventName = document.getElementById('display-event-name').innerText;
    
    let activeRoomData = { id: roomID, status: 'open', timestamp: firebase.database.ServerValue.TIMESTAMP };
    if (mjName && mjName !== "MJ") activeRoomData.mjName = mjName;
    if (eventName && eventName !== "PARTIE EN COURS") activeRoomData.eventName = eventName;
    
    const publicRef = db.ref('activeRooms/' + roomID);
    publicRef.set(activeRoomData).then(() => {
        publicRef.onDisconnect().remove();
        alert("✅ Porte d'entrée réparée ! Les joueurs déconnectés peuvent de nouveau scanner le QR Code.");
    }).catch(e => {
        alert("❌ Erreur réseau : Impossible de forcer l'ouverture. Vérifiez votre connexion Wi-Fi. (" + e.message + ")");
    });
}

/* --- PATCH V1.268 : OUVERTURE SCORES FAÇON "PENNYLANE" (COMPATIBLE APP BUREAU) --- */
function openScoreBoard() { 
    if(!roomID) return; 
    const url = window.location.href.split('?')[0].substring(0, window.location.href.split('?')[0].lastIndexOf('/')) + "/scores.html?room=" + roomID;
    
    // On crée un faux lien HTML invisible pour forcer Chrome à ouvrir un vrai onglet
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function toggleGuide() { const o = document.getElementById('overlay-guide'); if(o.style.display === 'flex') o.style.display = 'none'; else { o.style.display = 'flex'; document.getElementById('guide-iframe').src = "guide.html?t=" + Date.now(); } }
function showRemoteQR() { const o = document.getElementById('overlay-remote-qr'); const q = document.getElementById('qrcode-remote'); q.innerHTML = ""; new QRCode(q, { text: window.location.href.split('?')[0].substring(0, window.location.href.split('?')[0].lastIndexOf('/')) + "/remote.html?room=" + roomID, width: 250, height: 250 }); o.style.display = 'flex'; }


// --- MOTEUR TEMPS RÉEL FIREBASE & AFFICHAGE DES JOUEURS / ÉQUIPES ---
function initMJLogic() {
    roomRef.child('customBackground').on('value', snap => { currentRoomBgUrl = snap.val() || ""; });
    roomRef.child('eventName').on('value', snap => { if(snap.exists()) document.getElementById('display-event-name').innerText = snap.val(); else document.getElementById('display-event-name').innerText = "PARTIE EN COURS"; });
    roomRef.child('mjName').on('value', snap => { if(snap.exists()) document.getElementById('display-mj-name').innerText = "Animé par " + snap.val(); else document.getElementById('display-mj-name').innerText = "Animé par MJ"; });
    
    // 🚀 ÉCOUTEUR DES RÈGLES DU JEU (Mise à jour des badges Console MJ)
    roomRef.child('settings').on('value', snap => {
        if (window.isSandboxMode) return;
        const settings = snap.val() || { gameMode: 'mixed', teamLock: 'individual' };
        window.roomSettings = settings; // Sauvegarde globale pour la console
        
        const badgeMode = document.getElementById('badge-game-mode');
        const badgeLock = document.getElementById('badge-team-lock');
        if (badgeMode && badgeLock) {
            if (settings.gameMode === 'solo_only') {
                badgeMode.innerText = "100% Solo";
                badgeMode.style.background = "#8e44ad";
                badgeLock.style.display = 'none'; // Pas de blocage d'équipe en solo
            } else {
                badgeMode.innerText = settings.gameMode === 'team_only' ? "100% Équipes" : "Mode Mixte";
                badgeMode.style.background = settings.gameMode === 'team_only' ? "var(--success)" : "var(--blue)";
                badgeLock.style.display = 'inline-block';
                badgeLock.innerText = settings.teamLock === 'team' ? "🛑 Bloc. ÉQUIPE" : "🛑 Bloc. INDIV.";
            }
        }
        
        // 🚀 CORRECTION : On force le rafraîchissement des listes pour appliquer le grisage immédiatement
        renderLobby();
        renderTeamLobby();
    });

    // 🚀 PATCH V1.270 : ÉCOUTEUR MODE JOUR (Console MJ globale)
    roomRef.child('settings/dayMode').on('value', snap => {
        if (window.isSandboxMode) return;
        const isDay = snap.val() === true;
        const btn = document.getElementById('btn-day-mode');
        
        if (isDay) {
            document.body.classList.add('day-mode');
            if (btn) btn.innerHTML = "🌙 MODE NUIT";
        } else {
            document.body.classList.remove('day-mode');
            if (btn) btn.innerHTML = "☀️ MODE JOUR";
            // Restaure le fond personnalisé du MJ en mode Nuit
            if (mjProfileData.consoleBackground) {
                applyMjConsoleBg(mjProfileData.consoleBackground);
            }
        }
    });
    roomRef.child('players').on('value', snap => { 
        if(window.isSandboxMode) return; // 🚀 BARRIÈRE BAC À SABLE
        const rawData = snap.val() || {}; 
        allPlayersData = {};

        /* --- PATCH V1.216 : L'EXORCISME DES FANTÔMES (Niveau MJ) --- */
        Object.keys(rawData).forEach(uid => {
            const p = rawData[uid];
            // Si le joueur a un vrai nom, on l'accepte. Sinon, on le désintègre !
            if (p && p.name && p.name !== "undefined" && p.name.trim() !== "") {
                allPlayersData[uid] = { uid: uid, ...p };
            }
        });
        
        let teamCaptains = {};
        let fixNeeded = false;
        let updates = {};
        let teamsToCheck = new Set(); // On crée une liste des équipes à vérifier
        
        Object.keys(allPlayersData).forEach(uid => {
            const p = allPlayersData[uid];
            if (p.teamName && p.teamName !== "Solo") {
                teamsToCheck.add(p.teamName); // On liste l'équipe
                if (p.isCaptain) {
                    if (!teamCaptains[p.teamName]) {
                        teamCaptains[p.teamName] = { uid: uid, ts: p.joinTimestamp || 0 };
                    } else {
                        fixNeeded = true;
                        if ((p.joinTimestamp || 0) < teamCaptains[p.teamName].ts) {
                            updates[teamCaptains[p.teamName].uid + '/isCaptain'] = false;
                            teamCaptains[p.teamName] = { uid: uid, ts: p.joinTimestamp || 0 };
                        } else {
                            updates[uid + '/isCaptain'] = false;
                        }
                    }
                }
            }
        });
        
        if (fixNeeded) {
            logEvent('SYSTEM', `🛠️ Le système a destitué automatiquement un capitaine en doublon`); // 🟢 CAPTEUR
            roomRef.child('players').update(updates);
        }
        
        // --- DÉCLENCHEMENT DE LA SUCCESSION AUTOMATIQUE ---
        teamsToCheck.forEach(team => {
            handleCaptainSuccession(team);
        });
        
        renderLobby(); 
        renderTeamLobby();
    });

    roomRef.child('buzzers').on('value', snap => {
        if(window.isSandboxMode) return; // 🚀 BARRIÈRE BAC À SABLE
        const b = snap.val(); const box = document.getElementById('player-box');
        if(b) { 
            currentBuzzerId = b.id; const ps = b.pseudo;
            if (ps) { if (!buzzHistory.includes(ps)) buzzHistory.push(ps); else { buzzHistory = buzzHistory.filter(n => n !== ps); buzzHistory.push(ps); } }
            let rd = null; if(b.id && allPlayersData[b.id]) { rd = allPlayersData[b.id]; currentPlayer = { id: b.id, ...rd }; } else if(ps) { for(const [uid, p] of Object.entries(allPlayersData)) { if(p.name === ps) { rd = p; currentPlayer = { id: uid, ...rd }; break; } } }
            if(rd) { const a = document.getElementById('p-avatar'); if(rd.avatar && rd.avatar.length > 20) a.innerHTML = `<img src="${rd.avatar}" style="width:70px; height:70px; border-radius:50%; object-fit:cover;">`; else a.innerHTML = rd.avatar || '👤'; document.getElementById('p-name').innerText = rd.name; box.style.display = "block"; if(rd.teamName && rd.teamName !== "Solo") { document.getElementById('p-team').innerHTML = `<div class="crest-mini-bg"><img src="${globalTeams[rd.teamName] ? globalTeams[rd.teamName].icon : rd.teamIcon}" class="crest-mini"></div><span>${rd.teamName}</span>`; } else document.getElementById('p-team').innerHTML = "Solo"; }
        } else { 
            currentBuzzerId = null; 
            box.style.display = "none"; 
            currentPlayer = null;
        }
        renderLobby(); 
    });

    // --- PATCH V1.245 : HARMONISATION AVEC REMOTE (VERROUILLAGE BOUTON) ---
    roomRef.child('gameState').on('value', snap => {
        if (window.isSandboxMode) return;
        const st = snap.val() ? snap.val().status : 'waiting';
        currentGameState = st; 

        // Gestion du bouton Ouvrir Buzzers (Identique à remote.html)
        const btnOpenBuzz = document.getElementById('btn-open-buzz');
        if (btnOpenBuzz) {
            if (st === 'ready' || st === 'taken' || st === 'processing') {
                btnOpenBuzz.disabled = true;
                btnOpenBuzz.innerHTML = "🟢 BUZZERS OUVERTS";
            } else { 
                // Se dégrise en état 'waiting' (après Reset) ou suite aux récompenses (+3/+1)
                btnOpenBuzz.disabled = false;
                btnOpenBuzz.innerHTML = "Ouvrir Buzzers";
            }
        }
        
        // Gestion de l'affichage de l'encart du joueur qui a buzzé
        const boxPlayer = document.getElementById('player-box');
        if (boxPlayer) {
            if (st === 'taken') {
                boxPlayer.style.display = 'block'; 
            } else {
                boxPlayer.style.display = 'none'; 
            }
        }
        
        renderLobby();
        renderTeamLobby();
    });

    roomRef.child('buzzAttempts').on('value', snap => {
        if (window.isSandboxMode) return;
        // On laisse passer les données, on bloque seulement si le fantôme du gagnant précédent est encore là
        if (currentPlayer) return; 
        
        const attempts = snap.val();
        if (!attempts) return;
        
        if (!buzzProcessing) {
            buzzProcessing = true;
            roomRef.child('gameState').set({status: 'processing'}); 
            
            setTimeout(() => {
                roomRef.child('buzzAttempts').once('value').then(finalSnap => {
                    const finalAttempts = finalSnap.val();
                    if (!finalAttempts) { 
                        buzzProcessing = false; 
                        roomRef.child('gameState').set({status: 'ready'}); 
                        return; 
                    }
                    
                    let winner = null;
                    let minTime = Infinity;
                    
                    Object.values(finalAttempts).forEach(att => {
                        if (!currentBlocked[att.pseudo]) { 
                            if (att.timestamp < minTime) {
                                minTime = att.timestamp;
                                winner = att;
                            }
                        }
                    });
                    
                    if (winner) {
                        logEvent('BUZZ', `⚡ ${winner.pseudo} a pris la main !`);
                        roomRef.child('buzzers').set({ 
                            id: winner.id, 
                            pseudo: winner.pseudo, 
                            avatar: winner.avatar, 
                            teamName: winner.teamName, 
                            teamIcon: winner.teamIcon 
                        });
                        roomRef.child('gameState').set({status: 'taken'});
                    } else {
                        roomRef.child('gameState').set({status: 'ready'});
                        roomRef.child('buzzAttempts').remove();
                    }
                    buzzProcessing = false;
                });
            }, 300); 
        }
    });

    roomRef.child('teams').on('value', snap => { 
        if(window.isSandboxMode) return; // 🚀 BARRIÈRE BAC À SABLE
        globalTeams = snap.val() || {}; 
        renderLobby(); 
        renderTeamLobby();
    });
    
    roomRef.child('blockedPlayers').on('value', snap => { 
        if(window.isSandboxMode) return; // 🚀 BARRIÈRE BAC À SABLE
        currentBlocked = snap.val() || {};
        renderLobby(); 
    });
}

function setPlayerFilter(filter) {
    currentPlayerFilter = filter;
    document.querySelectorAll('#player-filters button').forEach(btn => btn.classList.remove('active'));
    document.getElementById('filter-btn-' + filter).classList.add('active');
    renderLobby();
}

function renderLobby() {
    let hA = "", hI = "", hB = ""; let hsB = false, hsI = false;
    const sl = document.getElementById('score-list'), il = document.getElementById('inactive-list'), bl = document.getElementById('banned-list');
    const is = document.getElementById('inactive-section'), bs = document.getElementById('banned-section');
    
    const sortHtml = `
        <div class="sort-header grid-player">
            <div class="sort-col grid-cell-center ${playerSort.col==='status'?'sort-active':''}" onclick="setSort('player','status')" title="Trier par État">${getSortArrow('player','status')} ÉTAT</div>
            <div class="sort-col grid-cell-left ${playerSort.col==='name'?'sort-active':''}" onclick="setSort('player','name')" title="Trier par Nom">${getSortArrow('player','name')} NOM</div>
            <div class="sort-col grid-cell-left ${playerSort.col==='team'?'sort-active':''}" onclick="setSort('player','team')" title="Trier par Mode/Équipe">${getSortArrow('player','team')} MODE</div>
            <div class="sort-col grid-cell-center ${playerSort.col==='warn'?'sort-active':''}" onclick="setSort('player','warn')" title="Trier par Avertissement">${getSortArrow('player','warn')} 🟨</div>
            <div class="sort-col grid-cell-left ${playerSort.col==='pts'?'sort-active':''}" onclick="setSort('player','pts')" title="Trier par Score">${getSortArrow('player','pts')} SCORE</div>
        </div>`;
    
    let pArr = [];
    // 🚀 MODIFICATION : Nouveaux compteurs séparés pour Actifs et Inactifs
    let counts = { all: 0, active: 0, inactive: 0, banned: 0, recoveryActive: 0, recoveryInactive: 0 };
    
    Object.keys(allPlayersData).forEach(uid => { 
        const d = allPlayersData[uid]; if(!d)return;
        let status = 0; if(d.banned) status=2; else if(d.active===false) status=1;
        
        counts.all++;
        if (status === 0) {
            counts.active++;
            // Ne compte que si c'est exactement "true" (demande en attente)
            if (d.recoveryRequest === true) counts.recoveryActive++;
        }
        if (status === 1) {
            counts.inactive++;
            // Ne compte que si c'est exactement "true" (demande en attente)
            if (d.recoveryRequest === true) counts.recoveryInactive++;
        }
        if (status === 2) counts.banned++;
        
        pArr.push({ uid: uid, status: status, ...d }); 
    });

    /* --- MODIFICATION : ALERTE INDÉPENDANTE SUR LES ONGLETS ACTIFS ET INACTIFS --- */
    document.getElementById('filter-btn-all').innerText = `Tous (${counts.all})`;
    
    const btnActive = document.getElementById('filter-btn-active');
    if (counts.recoveryActive > 0) {
        btnActive.classList.add('tab-pulse');
        btnActive.innerText = `🟢 Actifs (${counts.active}) ⚠️`;
    } else {
        btnActive.classList.remove('tab-pulse');
        btnActive.innerText = `🟢 Actifs (${counts.active})`;
    }
    
    const btnInactive = document.getElementById('filter-btn-inactive');
    if (counts.recoveryInactive > 0) {
        btnInactive.classList.add('tab-pulse');
        btnInactive.innerText = `🟠 Inactifs (${counts.inactive}) ⚠️`;
    } else {
        btnInactive.classList.remove('tab-pulse');
        btnInactive.innerText = `🟠 Inactifs (${counts.inactive})`;
    }
    
    document.getElementById('filter-btn-banned').innerText = `🔴 Bannis (${counts.banned})`;

    pArr.sort((a, b) => {
        /* PATCH : Les recoveryRequest remontent TOUJOURS en n°1 absolu */
        if (a.recoveryRequest && !b.recoveryRequest) return -1;
        if (!a.recoveryRequest && b.recoveryRequest) return 1;

        if (a.uid === currentBuzzerId) return -1; if (b.uid === currentBuzzerId) return 1;
        let valA, valB;
        let nameA = a.name || "Inconnu";
        let nameB = b.name || "Inconnu";
        
        if (playerSort.col === 'name') { valA = nameA.toLowerCase(); valB = nameB.toLowerCase(); }
        else if (playerSort.col === 'pts') { valA = a.pts || 0; valB = b.pts || 0; }
        else if (playerSort.col === 'status') { valA = a.status; valB = b.status; }
        else if (playerSort.col === 'team') { valA = (a.teamName||"Solo").toLowerCase(); valB = (b.teamName||"Solo").toLowerCase(); }
        else if (playerSort.col === 'warn') { valA = a.hasBeenWarned ? 1 : 0; valB = b.hasBeenWarned ? 1 : 0; }
        else {
            let iA=buzzHistory.indexOf(nameA), iB=buzzHistory.indexOf(nameB);
            if(iA!==-1 || iB!==-1) return iB-iA;
            valA = nameA.toLowerCase(); valB = nameB.toLowerCase();
        }
        if (valA < valB) return playerSort.asc ? -1 : 1;
        if (valA > valB) return playerSort.asc ? 1 : -1;
        return 0;
    });

    hA = sortHtml;
    const searchVal = document.getElementById('player-search') ? document.getElementById('player-search').value.trim().toLowerCase() : "";

    pArr.forEach(d => {
        let safeNameDisplay = d.name || "Inconnu";
        if (searchVal && !safeNameDisplay.toLowerCase().includes(searchVal)) return;

        let tO = `<option value="Solo" ${d.teamName==="Solo"?"selected":""}>Solo</option>`; 
        Object.keys(globalTeams).forEach(t => { if(globalTeams[t].active!==false&&globalTeams[t].banned!==true) tO += `<option value="${t}" ${d.teamName===t?"selected":""}>${t}</option>`; });
        
        // 🚀 Désactivation du selecteur si mode 100% Solo imposé
        let selectDisabled = (typeof window.roomSettings !== 'undefined' && window.roomSettings.gameMode === 'solo_only') ? 'disabled="disabled"' : '';
        
        const aH = (d.avatar&&d.avatar.length>20) ? `<img src="${d.avatar}" style="width:20px;height:20px;border-radius:50%;object-fit:cover;flex-shrink:0;">` : `<span style="font-size:1.1rem;flex-shrink:0;width:20px;text-align:center;">${d.avatar||'👤'}</span>`;
		
        // 🚀 PLACEMENT : Séparation des boutons rapides (✔/✖) et du menu (⋮)
        let quickActionsHtml = "";
        if (d.recoveryRequest && d.recoveryRequest !== 'validated') {
            quickActionsHtml = `<div class="recovery-actions" style="margin-left:auto;">
                <button class="btn-quick btn-quick-check" onclick="acceptRecovery('${d.uid}')" title="Accepter la connexion">✔</button>
                <button class="btn-quick btn-quick-cancel" onclick="rejectRecovery('${d.uid}')" title="Refuser">✖</button>
            </div>`;
        }
        let actionsMenuHtml = `<button class="dropdown-btn" onclick="openPlayerMenu(event, '${d.uid}')">⋮</button>`;
        /* --- PATCH 3.25 : COURONNE LOBBY JOUEURS --- */let crownIcon = d.isCaptain ? '<span style="margin-left:5px; filter:drop-shadow(0 0 2px gold);">👑</span>' : '';
        
        // 🚀 NOUVEAU : CARTON JAUNE (Séparé du pseudo, placé dans sa colonne dédiée)
        let warnIcon = d.hasBeenWarned ? '<span style="font-size:0.9rem; filter:drop-shadow(0 0 2px red);" title="Joueur Averti">🟨</span>' : '';
        
        // Si l'état est pris (taken) ET que c'est le joueur en cours, on met la cloche
        // Sinon on garde le point vert standard
        let stateDot = d.status === 2 ? '🔴' : (d.status === 1 ? '🟠' : ((d.uid === currentBuzzerId && currentGameState === 'taken') ? '🔔' : '🟢'));
        
        if (d.status === 2) {
            hsB = true;
            hB += `<div class="score-row grid-player" style="border:1px solid var(--danger);">
                        <div class="grid-cell-center" style="font-size:0.75rem;">${stateDot}</div>
                        <div class="grid-cell-left" style="color:var(--danger); gap:6px; width:100%; display:flex;">${aH}<b style="overflow:hidden;text-overflow:ellipsis;">${safeNameDisplay}${crownIcon}</b>${quickActionsHtml}</div>
                        <div></div>
                        <div class="grid-cell-center">${warnIcon}</div>
                        <div class="player-controls">${actionsMenuHtml}</div>
                   </div>`;
        } else if (d.status === 1) {
            hsI = true;
            let txt = d.recoveryRequest ? `<small style="color:var(--gold);font-style:italic;">Tentative...</small>` : `<small>(${d.pts||0} pts)</small>`;
            // 🚀 CORRECTION : Clignotement inactif ignoré si 'validated'
            let rClass = (d.recoveryRequest && d.recoveryRequest !== 'validated') ? "score-row airlock-row grid-player pulse-alert" : "score-row grid-player";
            let opac = d.recoveryRequest ? "1" : "0.6";
            hI += `<div class="${rClass}" style="opacity:${opac};">
                        <div class="grid-cell-center" style="font-size:0.75rem;">${stateDot}</div>
                        <div class="grid-cell-left" style="gap:6px; width:100%; display:flex;">${aH}<b style="overflow:hidden;text-overflow:ellipsis;">${safeNameDisplay}${crownIcon}</b>${quickActionsHtml}</div>
                        <div class="grid-cell-left">${txt}</div>
                        <div class="grid-cell-center">${warnIcon}</div>
                        <div class="player-controls">${actionsMenuHtml}</div>
                   </div>`;
        } else {
            // 🚀 ALERTE ORANGE : Clignote si demande en cours, même si le joueur est actif
            let rC = (d.uid === currentBuzzerId && currentGameState === 'taken') ? "score-row buzzer-active-row grid-player" : "score-row grid-player";
            if (d.recoveryRequest && d.recoveryRequest !== 'validated') rC += " pulse-alert";
            hA += `
            <div class="${rC}">
                <div class="grid-cell-center" style="font-size:0.75rem;">${stateDot}</div>
                <div class="grid-cell-left" style="gap:6px; width:100%; display:flex;">${aH}<b style="overflow:hidden;text-overflow:ellipsis;">${safeNameDisplay}${crownIcon}</b>${quickActionsHtml}</div>
                <div class="grid-cell-left"><select class="mini-select" onchange="togglePlayerTeam('${d.uid}', this.value)" ${selectDisabled}>${tO}</select></div>
                <div class="grid-cell-center">${warnIcon}</div>
                <div class="player-controls">
                    <div class="team-score-ctrl">
                        <button class="btn-tiny" onclick="adj('${d.uid}',-1)">-</button>
                        <input type="number" value="${d.pts||0}" onchange="setPlayerScore('${d.uid}', this.value)" style="width:28px;text-align:center;background:transparent;border:none;color:var(--accent);font-weight:bold;font-size:0.95rem;padding:0;margin:0;">
                        <button class="btn-tiny" onclick="adj('${d.uid}',1)">+</button>
                    </div>
                    ${actionsMenuHtml}
                </div>
            </div>`;
        }
    });
    
    sl.innerHTML = hA; il.innerHTML = hI; bl.innerHTML = hB; 
    if(currentPlayerFilter === 'all') { sl.style.display = counts.active > 0 ? 'block' : 'none'; bs.style.display = hsB ? "block" : "none"; is.style.display = hsI ? "block" : "none"; } 
    else if (currentPlayerFilter === 'active') { sl.style.display = 'block'; bs.style.display = 'none'; is.style.display = 'none'; } 
    else if (currentPlayerFilter === 'inactive') { sl.style.display = 'none'; bs.style.display = 'none'; is.style.display = 'block'; } 
    else if (currentPlayerFilter === 'banned') { sl.style.display = 'none'; bs.style.display = 'block'; is.style.display = 'none'; }
}

function saveFocus() { const active = document.activeElement; if (active && active.tagName === 'INPUT' && active.type === 'text') { return { id: active.id, start: active.selectionStart, end: active.selectionEnd, val: active.value }; } return null; }
function restoreFocus(focusData) { if (focusData && focusData.id) { setTimeout(() => { const el = document.getElementById(focusData.id); if (el) { el.focus(); el.value = focusData.val; el.setSelectionRange(focusData.start, focusData.end); } }, 0); } }

function setMjTeamFilter(filter) {
    currentMjTeamFilter = filter;
    document.querySelectorAll('#mj-team-filters button').forEach(btn => btn.classList.remove('active'));
    document.getElementById('tfilter-btn-' + filter).classList.add('active');
    renderTeamLobby();
}

function renderTeamLobby() {
    if (isRenderingTeamLobby) return;
    isRenderingTeamLobby = true;
    const container = document.getElementById('mj-team-lobby-list');
    const searchVal = document.getElementById('mj-team-search').value.trim().toLowerCase();
    const focusData = saveFocus();

    const sortHtml = `
        <div class="sort-header grid-team">
            <div></div>
            <div class="sort-col grid-cell-center ${teamSort.col==='status'?'sort-active':''}" onclick="setSort('team','status')" title="Trier par État">${getSortArrow('team','status')} ÉTAT</div>
            <div class="sort-col grid-cell-left ${teamSort.col==='name'?'sort-active':''}" onclick="setSort('team','name')" title="Trier par Nom">${getSortArrow('team','name')} ÉQUIPE</div>
            <div class="sort-col grid-cell-center ${teamSort.col==='score'?'sort-active':''}" onclick="setSort('team','score')" title="Trier par Score Total">${getSortArrow('team','score')} SCORE</div>
            <div class="sort-col grid-cell-left ${teamSort.col==='bonus'?'sort-active':''}" onclick="setSort('team','bonus')" title="Trier par Bonus">${getSortArrow('team','bonus')} BONUS</div>
        </div>`;
    container.innerHTML = sortHtml;

    let counts = { all: 0, active: 0, inactive: 0, banned: 0 };

    let tArr = Object.keys(globalTeams).filter(k => k !== "Solo").map(k => {
        const t = globalTeams[k];
        let total = 0, aC = 0, iC = 0, bC = 0;
        Object.values(allPlayersData).forEach(p => { 
            if(p.teamName === k) {
                total += (p.pts || 0);
                if(p.banned) bC++;
                else if(p.active === false) iC++;
                else aC++;
            } 
        });
        total += (t.bonus || 0);
        
        let status = 0; 
        if(t.banned) status=2; 
        else if(t.active===false) status=1;
        else if((aC+iC+bC) === 0) status=3;

        counts.all++;
        if (status === 2) counts.banned++;
        else if (status === 1) counts.inactive++;
        else counts.active++;

        let hasBuzzer = Object.values(allPlayersData).some(p => p.teamName === k && p.uid === currentBuzzerId && currentGameState === 'taken');
        return { key: k, status: status, totalScore: total, aC: aC, iC: iC, bC: bC, hasBuzzer: hasBuzzer, ...t };
    });

    document.getElementById('tfilter-btn-all').innerText = `Toutes (${counts.all})`;
    document.getElementById('tfilter-btn-active').innerText = `🟢 Actives (${counts.active})`;
    document.getElementById('tfilter-btn-inactive').innerText = `🟠 Inactives (${counts.inactive})`;
    document.getElementById('tfilter-btn-banned').innerText = `🔴 Bannies (${counts.banned})`;

    tArr.sort((a, b) => {
        // 🚀 NOUVEAU : Priorité Absolue 1 - L'urgence de reconnexion
        let emergencyA = false;
        for (let pId in allPlayersData) {
            if (allPlayersData[pId].teamName === a.key && allPlayersData[pId].recoveryRequest) { emergencyA = true; break; }
        }
        let emergencyB = false;
        for (let pId in allPlayersData) {
            if (allPlayersData[pId].teamName === b.key && allPlayersData[pId].recoveryRequest) { emergencyB = true; break; }
        }
        
        if (emergencyA && !emergencyB) return -1;
        if (!emergencyA && emergencyB) return 1;

        // Priorité 2 : Le buzzer actif (ton code existant)
        if (a.hasBuzzer) return -1; if (b.hasBuzzer) return 1;
        
        // Priorité 3 : Le tri normal (ton code existant)
        let valA, valB;
        if (teamSort.col === 'name') { valA = a.key.toLowerCase(); valB = b.key.toLowerCase(); }
        else if (teamSort.col === 'score') { valA = a.totalScore; valB = b.totalScore; }
        else if (teamSort.col === 'bonus') { valA = a.bonus || 0; valB = b.bonus || 0; }
        else if (teamSort.col === 'status') { valA = a.status; valB = b.status; }
        else { valA = a.key.toLowerCase(); valB = b.key.toLowerCase(); }
        if (valA < valB) return teamSort.asc ? -1 : 1;
        if (valA > valB) return teamSort.asc ? 1 : -1;
        return 0;
    });
	
    let html = sortHtml;
    tArr.forEach(t => {
        const k = t.key;
        if (currentMjTeamFilter === 'active' && (t.status !== 0 && t.status !== 3)) return;
        if (currentMjTeamFilter === 'inactive' && t.status !== 1) return;
        if (currentMjTeamFilter === 'banned' && t.status !== 2) return;
        if (searchVal && !k.toLowerCase().includes(searchVal)) return;
        
        let stateDot = t.status === 2 ? '🔴' : (t.status === 1 ? '🟠' : (t.status === 3 ? '⚫' : '🟢'));
        
        let statsHtml = `<span style="font-size:0.75rem; font-style:italic; margin-left:8px; opacity:0.9;">Joueurs : `;
        let parts = [];
        if(t.aC > 0) parts.push(`<span style="color:var(--success); font-weight:bold;">${t.aC} actif${t.aC > 1 ? 's' : ''}</span>`);
        if(t.iC > 0) parts.push(`<span style="color:var(--gold); font-weight:bold;">${t.iC} inactif${t.iC > 1 ? 's' : ''}</span>`);
        if(t.bC > 0) parts.push(`<span style="color:var(--danger); font-weight:bold;">${t.bC} banni${t.bC > 1 ? 's' : ''}</span>`);
        if(parts.length === 0) statsHtml += `<span style="color:#bdc3c7;">0</span>`;
        else statsHtml += parts.join(', ');
        statsHtml += `</span>`;

        const safeK = k.replace(/'/g, "\\'");
        
        // Détection de l'urgence
        let hasEmergency = false;
        for (let pId in allPlayersData) {
            // 🚀 CORRECTION : On arrête le clignotement si c'est validé
            if (allPlayersData[pId].teamName === k && allPlayersData[pId].recoveryRequest && allPlayersData[pId].recoveryRequest !== 'validated') {
                hasEmergency = true;
                break;
            }
        }
        
        let rowClasses = "hub-line grid-team";
        if (hasEmergency) rowClasses += " recovery-alert-team";

        // 🚀 NOUVEAU : Si urgence, on supprime totalement la bordure verte pour ne pas bloquer l'animation CSS
        const border = (t.hasBuzzer && !hasEmergency) ? 'border:2px solid #2ecc71; background:rgba(46,204,113,0.1);' : '';
        
        html += `
        <div class="${rowClasses}" style="${border}" onclick="toggleTeamAccordion('${safeK}')" title="Cliquez pour voir les détails et les joueurs de l'équipe">
            <div class="grid-cell-center"><span id="team-arrow-${k}" class="hub-arrow" style="margin-right:0; font-size:0.75rem;">▶</span></div>
            <div class="grid-cell-center" style="font-size:0.75rem;">${stateDot}</div>
            <div class="grid-cell-left" style="gap:6px;"><div style="width:20px;height:20px;background:white;border-radius:3px;overflow:hidden;display:flex;justify-content:center;align-items:center;flex-shrink:0;"><img src="${t.icon}" style="width:100%;height:100%;object-fit:contain;"></div><b style="color:var(--accent); overflow:hidden;text-overflow:ellipsis;">${k}</b>${statsHtml}</div>
            <div class="grid-cell-center"><b style="color:white; font-size:1.05rem;">${t.totalScore}</b></div>
            <div class="team-controls">
                <div class="team-score-ctrl">
                    <button class="btn-tiny" onclick="event.stopPropagation(); updateTeamBonus('${safeK}', -1)">-</button>
                    <span class="team-bonus-val" style="min-width:18px;">${t.bonus || 0}</span>
                    <button class="btn-tiny" onclick="event.stopPropagation(); updateTeamBonus('${safeK}', 1)">+</button>
                </div>
                <button class="dropdown-btn" onclick="openTeamMenu(event, '${safeK}')">⋮</button>
            </div>
        </div>
        <div id="team-details-${k}" class="hub-details" style="display:none;" onclick="event.stopPropagation();">
            <div id="list-member-${k}"></div>
        </div>`;
    });
    container.innerHTML = html;
    if (currentOpenTeam) {
        const det = document.getElementById('team-details-' + currentOpenTeam);
        if (det) { det.style.display = 'block'; document.getElementById('team-arrow-' + currentOpenTeam).classList.add('open'); renderTeamMembers(currentOpenTeam); }
    }
    restoreFocus(focusData);
    isRenderingTeamLobby = false;
}

function toggleTeamAccordion(teamName) {
    if (currentOpenTeam === teamName) {
        document.getElementById('team-details-' + teamName).style.display = 'none';
        document.getElementById('team-arrow-' + teamName).classList.remove('open');
        if (activeTeamBlacklistListener && roomRef && !window.isSandboxMode) roomRef.child('teams/'+teamName+'/blacklist').off('value', activeTeamBlacklistListener);
        currentOpenTeam = null;
        return;
    }
    if (currentOpenTeam) {
        const oldDet = document.getElementById('team-details-' + currentOpenTeam);
        if (oldDet) oldDet.style.display = 'none';
        const oldArr = document.getElementById('team-arrow-' + currentOpenTeam);
        if (oldArr) oldArr.classList.remove('open');
        if (activeTeamBlacklistListener && roomRef) roomRef.child('teams/'+currentOpenTeam+'/blacklist').off('value', activeTeamBlacklistListener);
    }
    
    currentOpenTeam = teamName;
    const newDet = document.getElementById('team-details-' + teamName);
    if (newDet) newDet.style.display = 'block';
    const newArr = document.getElementById('team-arrow-' + teamName);
    if (newArr) newArr.classList.add('open');

    if (window.isSandboxMode) {
        activeTeamBlacklist = [];
        renderTeamMembers(teamName);
        return;
    }

    activeTeamBlacklistListener = roomRef.child('teams/'+teamName+'/blacklist').on('value', snap => {
        activeTeamBlacklist = [];
        snap.forEach(child => {
            activeTeamBlacklist.push({ id: child.key, ...child.val() });
        });
        renderTeamMembers(teamName);
    });
}

/* --- PATCH V1.214 : ACCORDÉON (TRI, SCORE CENTRÉ ET PASTILLES) --- */
function renderTeamMembers(teamName) {
    const list = document.getElementById('list-member-' + teamName);
    if (!list) return;

    let displayList = [];
    Object.keys(allPlayersData).forEach(uid => {
        const p = allPlayersData[uid];
        if (p.teamName === teamName && p.banned !== true) {
            // 🚀 CORRECTION : L'inactivité prend le dessus, et la cloche disparaît quand le MJ valide la réponse
            let status = 0;
            if (p.active === false) status = 1;
            else if (uid === currentBuzzerId && currentGameState === 'taken') status = -1;
            
            displayList.push({ id: uid, status: status, ...p });
        }
    });

    let currentCapId = "";
    let currentCapName = "";
    displayList.forEach(m => {
        if (m.isCaptain) { currentCapId = m.id; currentCapName = m.name || "Inconnu"; }
    });

    // Tri dynamique
    displayList.sort((a, b) => {
        // 🚀 NOUVEAU : Priorité Absolue (Urgence de récupération avant tout)
        if (a.recoveryRequest && !b.recoveryRequest) return -1;
        if (!a.recoveryRequest && b.recoveryRequest) return 1;

        let valA, valB;
        if (memberSort.col === 'status') { valA = a.status; valB = b.status; }
        else if (memberSort.col === 'captain') { valA = a.isCaptain ? 1 : 0; valB = b.isCaptain ? 1 : 0; }
        else if (memberSort.col === 'name') { valA = (a.name||"").toLowerCase(); valB = (b.name||"").toLowerCase(); }
        else if (memberSort.col === 'pts') { valA = a.pts || 0; valB = b.pts || 0; }
        else { 
            if (a.status === -1) return -1; if (b.status === -1) return 1;
            if (a.status !== b.status) return a.status - b.status;
            if (a.isCaptain) return -1; if (b.isCaptain) return 1;
            valA = (a.name || "").toLowerCase(); valB = (b.name || "").toLowerCase();
        }
        if (valA < valB) return memberSort.asc ? -1 : 1;
        if (valA > valB) return memberSort.asc ? 1 : -1;
        return 0;
    });

    let html = `
        <div class="sort-header grid-member" style="margin-top:0; opacity:0.8; font-size:0.7rem;">
            <div class="sort-col grid-cell-center ${memberSort.col==='status'?'sort-active':''}" onclick="setSort('member','status')" title="Trier par État">${getSortArrow('member','status')} ÉTAT</div>
            <div class="sort-col grid-cell-center ${memberSort.col==='captain'?'sort-active':''}" onclick="setSort('member','captain')" title="Trier par Capitaine">${getSortArrow('member','captain')} CPT</div>
            <div class="sort-col grid-cell-left ${memberSort.col==='name'?'sort-active':''}" onclick="setSort('member','name')" title="Trier par Nom">${getSortArrow('member','name')} NOM</div>
            <div class="sort-col grid-cell-center ${memberSort.col==='pts'?'sort-active':''}" onclick="setSort('member','pts')" title="Trier par Score">${getSortArrow('member','pts')} SCORE</div>
            <div></div>
        </div>`;

    let safeCapName = currentCapName.replace(/'/g, "\\'");

    displayList.forEach(m => {
        let av = (m.avatar && m.avatar.length > 20) ? `<img src="${m.avatar}" style="width:18px;height:18px;border-radius:50%;object-fit:cover;">` : `<span style="font-size:1.1rem;">${m.avatar||'👤'}</span>`;
        let safeName = (m.name || "Inconnu").replace(/'/g, "\\'");
        let isInactive = m.status === 1;
        
        let rowStyle = isInactive ? "opacity:0.5; background:rgba(0,0,0,0.2);" : "background:rgba(255,255,255,0.05);";
        let recoveryClass = ""; // 🚀 NOUVEAU
        let quickActions = "";
        
        // 🚀 CORRECTION : On vérifie que ce n'est pas déjà 'validated'
        if (m.recoveryRequest && m.recoveryRequest !== 'validated') {
            rowStyle = "opacity:1;"; 
            recoveryClass = "pulse-alert"; 
            // 🚀 ALIGNEMENT : margin-left:auto pousse les boutons tout à droite
            quickActions = `<div class="recovery-actions" style="margin-left:auto;">
                <button class="btn-quick btn-quick-check" onclick="acceptRecovery('${m.id}')" title="Accepter">✔</button>
                <button class="btn-quick btn-quick-cancel" onclick="rejectRecovery('${m.id}')" title="Refuser">✖</button>
            </div>`;
        }
        
        // Pastille de joueur statique
        let stateIcon = (m.recoveryRequest && m.recoveryRequest !== 'validated') ? "⚠️" : (isInactive ? "🟠" : (m.status === -1 ? "🔔" : "🟢"));
		
        let crown = m.isCaptain ? `👑` : (isInactive ? "" : `<span class="ghost-crown" onclick="transferCaptaincy('${currentCapId}', '${safeCapName}', '${m.id}', '${safeName}', '${teamName}')">👑</span>`);
		
        // 🚀 ALIGNEMENT : Ajout de width:100% sur grid-cell-left pour laisser la place aux boutons
        html += `
        <div class="score-row grid-member ${recoveryClass}" style="${rowStyle} border-bottom:1px solid rgba(255,255,255,0.05); padding: 4px 8px;">
            <div class="grid-cell-center" style="font-size:0.8rem;">${stateIcon}</div>
            <div class="grid-cell-center">${crown}</div>
            <div class="grid-cell-left" style="gap:6px; font-size:0.85rem; display:flex; align-items:center; width:100%;">
                ${av}<b style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${m.name || "Inconnu"} ${isInactive ? '<small>(Hors-ligne)</small>' : ''}</b>
                ${quickActions}
            </div>
            <div class="team-score-ctrl" style="justify-content:center; background:rgba(0,0,0,0.4); padding:0 2px; border-radius:4px;">
                <button class="btn-tiny" onclick="adj('${m.id}',-1)">-</button>
                <span style="font-weight:bold; color:var(--accent); min-width:20px; text-align:center;">${m.pts||0}</span>
                <button class="btn-tiny" onclick="adj('${m.id}',1)">+</button>
            </div>
            <div class="grid-cell-center">
                <button class="dropdown-btn" style="margin:0;" onclick="openMemberMenu(event, '${m.id}', '${teamName}', false, ${m.isCaptain||false}, '${currentCapId}', '${safeCapName}')">⋮</button>
            </div>
        </div>`;
    });
    list.innerHTML = `<div style="display:flex; flex-direction:column; gap:2px;">${html}</div>`;
}

function expelTeamMember(uid, name, avatar, teamName) {
    if (window.isSandboxMode) {
        if (allPlayersData[uid]) { allPlayersData[uid].teamName = "Solo"; allPlayersData[uid].isCaptain = false; }
        updateSimuPhones(); renderLobby(); renderTeamLobby(); renderTeamMembers(teamName);
        return;
    }
    window.mjConfirm("✕ Expulser de l'équipe", `Retirer ${name} de l'équipe ${teamName} ?\nIl repassera en Solo.`, () => {
        logEvent('PUNISH', `MJ a expulsé ${name} de l'équipe ${teamName}`);
        roomRef.child('teams/' + teamName + '/blacklist/' + uid).set({ name: name, avatar: avatar });
        roomRef.child('players/' + uid).update({ teamName: "Solo", teamIcon: "", isCaptain: false });
    });
}

function pardonTeamMember(uid, teamName) { 
    if (window.isSandboxMode) return;
    logEvent('SYSTEM', `MJ a gracié un joueur de la liste noire de ${teamName}`);
    roomRef.child('teams/' + teamName + '/blacklist/' + uid).remove(); 
}

