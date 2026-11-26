/* ============================================================================
 * index-core.js — Initialisation Firebase, Navigation, Salles, Pseudo & Reconnexion
 * Application Joueurs - Buz'Ta Puce (v1.315)
 * ============================================================================ */

const avatars = ["🦁","🐯","🐼","🦊","🐵","🐶","🐱","🦄","😎","🤖","👽","👾","👻","🤡","🐙","🦉","🐸","🐹","🐰","🥳","🤠","😈","🎅","🧙","🧛","🧜","🧝","🧞","🧟","🧚","👼","🤵","🤴","👸","🕵","👮","👩‍🚒","👩‍🚀","🦸","🦹"];
let isExiting = false; 
let isRoomClosing = false;
let isCaptain = false;

let kickedFromTeam = "";
let reinstatedTeamRef = null;
let reinstatedTeamCallback = null; 
let activeTeamRef = null;
let activeTeamCallback = null; 
let isRecovering = false; 

let recoveryRef = null;
let pendingRecoveryUid = null;
let teamListRef = null;
let teamListCallback = null;

let wakeLock = null;
let availableRooms = []; 

async function requestWakeLock() {
    if ('wakeLock' in navigator) { try { wakeLock = await navigator.wakeLock.request('screen'); } catch (err) {} }
}
function releaseWakeLock() {
    if (wakeLock !== null) { wakeLock.release().catch(()=>{}); wakeLock = null; }
}
/* --- PATCH V1.306 : ANTI-AFK SÉCURISÉ (Le "Micro-ondes" Anti-S24) --- */
let reconnectTimer = null;
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && document.getElementById('step-game').classList.contains('active')) requestWakeLock();
    
    if (roomRef && myUserID && gameState !== 'endGame' && gameState !== 'closing') {
        if (document.hidden || document.visibilityState === 'hidden') {
            // On annule tout retour en cours si on repart en arrière-plan
            if (reconnectTimer) clearTimeout(reconnectTimer);
            
            logEvent('NETWORK', `📉 ${player.pseudo||'Un joueur'} a mis l'application en arrière-plan`); // 🟢 CAPTEUR
            roomRef.child('players/' + myUserID).update({ active: false });
        } else {
            // On place le retour dans le minuteur "micro-ondes" de 2 secondes
            if (reconnectTimer) clearTimeout(reconnectTimer);
            
            reconnectTimer = setTimeout(() => {
                logEvent('NETWORK', `📈 ${player.pseudo||'Un joueur'} est réellement revenu sur l'application (Dégel)`); // 🟢 CAPTEUR
                roomRef.child('players/' + myUserID).once('value', snap => {
                    const p = snap.val();
                    if (p && !p.banned && p.active === false && !p.recoveryRequest) {
                        roomRef.child('players/' + myUserID).update({ active: true, reconnectedAt: Date.now() });
                    }
                });
            }, 2000); // Le code attend 2 secondes avant de s'exécuter
        }
    }
});

function compressImage(file, maxWidth, callback) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas'); let width = img.width; let height = img.height;
            if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; }
            canvas.width = width; canvas.height = height; const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height); callback(canvas.toDataURL('image/jpeg', 0.7));
        }; img.src = e.target.result;
    }; reader.readAsDataURL(file);
}

/* --- PATCH V1.182 : GÉNÉRATION DES 30 BLASONS UNIQUES --- */
function createBlason(i) {
    const colors = ['#e74c3c', '#3498db', '#f1c40f', '#2c3e50', '#27ae60', '#8e44ad'];
    const c1 = colors[i % 6]; 
    const c2 = colors[(i + 2) % 6]; 
    let pattern = ""; 
    const pType = Math.floor(i / 6) % 5;
    
    if(pType === 0) pattern = `<rect width="100" height="100" fill="${c1}"/><rect x="40" width="20" height="100" fill="${c2}"/><rect y="40" width="100" height="20" fill="${c2}"/>`;
    else if(pType === 1) pattern = `<rect width="100" height="100" fill="${c1}"/><path d="M0 0 L100 100 M100 0 L0 100" stroke="${c2}" stroke-width="20"/>`;
    else if(pType === 2) pattern = `<rect width="100" height="100" fill="${c1}"/><path d="M0 50 L50 0 L100 50 L50 100 Z" fill="${c2}"/>`;
    else if(pType === 3) pattern = `<rect width="100" height="100" fill="${c1}"/><rect x="0" y="50" width="100" height="50" fill="${c2}"/>`;
    else pattern = `<rect width="100" height="100" fill="${c1}"/><rect x="50" y="0" width="50" height="100" fill="${c2}"/>`;
    
    return `data:image/svg+xml;base64,${btoa(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><clipPath id="shield"><path d="M10 0 H90 V40 C90 80 50 100 50 100 C50 100 10 80 10 40 Z"/></clipPath></defs><g clip-path="url(#shield)">${pattern}</g><path d="M10 0 H90 V40 C90 80 50 100 50 100 C50 100 10 80 10 40 Z" fill="none" stroke="#000" stroke-width="2"/></svg>`)}`;
}

const firebaseConfig = { apiKey: "AIzaSyAf1Vl_O8SHJeFjHavKBJgUFGGy73I8t-o", authDomain: "prestapuce-buzz.firebaseapp.com", databaseURL: "https://prestapuce-buzz-default-rtdb.europe-west1.firebasedatabase.app", projectId: "prestapuce-buzz", storageBucket: "prestapuce-buzz.firebasestorage.app", messagingSenderId: "907270883505", appId: "1:907270883505:web:197efec0b99db28180ba90" };
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let serverTimeOffset = 0;
db.ref('.info/serverTimeOffset').on('value', snap => {
    serverTimeOffset = snap.val() || 0;
});
let buzzerReadyTime = 0; // 🟢 Chronomètre local anti-latence

// 🟢 MOTEUR DU MOUCHARD (Côté Joueur)
function logEvent(actionType, message) {
    if (!roomID) return;
    db.ref('rooms/' + roomID + '/debugLog').push({
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        type: actionType,
        msg: message
    });
}

let roomID = "", roomRef = null, myUserID = ""; 
let roomSettings = { loginMode: 'full', gameMode: 'mixed' }; // 🚀 Paramètres MJ en direct
let player = { pseudo: "", avatar: "", team: "Solo", teamIcon: "" };

// 🚀 FONCTIONS DE ROUTAGE INTELLIGENT (BLINDÉES)
window.handleWelcomeNext = function() {
    try {
        let lMode = (typeof roomSettings !== 'undefined' && roomSettings && roomSettings.loginMode) ? roomSettings.loginMode : 'full';
        if (lMode === 'quick') navigateTo('step-pseudo');
        else navigateTo('step-auth');
    } catch (e) { navigateTo('step-auth'); } // Parachute
};

window.handleModeRouting = function() {
    try {
        let gMode = (typeof roomSettings !== 'undefined' && roomSettings && roomSettings.gameMode) ? roomSettings.gameMode : 'mixed';
        if (gMode === 'solo_only') selectMode('Solo');
        else if (gMode === 'team_only') goToTeamAction();
        else navigateTo('step-mode');
    } catch (e) { 
        console.error("Erreur routage:", e);
        navigateTo('step-mode'); // Parachute
    }
};
window.mySessionID = Math.random().toString(36).substring(2, 15); // Jeton unique
window.pendingRecoveryData = null; // Mémoire de récupération
let gameState = "waiting", currentWinner = null, isBlocked = false;
let selectedTeamCrest = "", isEditing = false, stepHistory = [];
let mjName = "l'Animateur", mjLink = "";
let html5QrCode = null;
let roomLibrary = {};
let currentWatchedTeam = "";

const lines = ["Transforme ton mobile en buzzer ! 🎧", "Joue en Solo, rejoins une Équipe...", "...ou crée ton propre Clan ! 🛡️"];
let lineIndex = 0, charIndex = 0;

function typeWriterSequence() {
    if(lineIndex >= lines.length) { document.querySelectorAll('.cursor').forEach(c => c.classList.add('hidden')); return; }
    const lineElement = document.getElementById(`line-${lineIndex + 1}`);
    if(lineElement) {
        document.querySelectorAll('.cursor').forEach(c => c.remove());
        lineElement.innerHTML = lines[lineIndex].substring(0, charIndex) + '<div class="cursor"></div>';
        if(charIndex < lines[lineIndex].length) { charIndex++; setTimeout(typeWriterSequence, 40); } 
        else { charIndex = 0; lineIndex++; setTimeout(typeWriterSequence, 400); }
    }
}

window.onload = () => {
    document.getElementById('version-display').innerText = "v" + CLIENT_VERSION;
    const vSpan = document.getElementById('display-client-version');
    if (vSpan) vSpan.innerText = CLIENT_VERSION;

    db.ref('config/versions/index').on('value', snap => {
        if (snap.exists()) {
            const rawVer = String(snap.val()).replace(/^v/, '');
            document.title = `Presta'Puce - Blind Test (v${rawVer})`;
            document.getElementById('version-display').innerText = "v" + rawVer;
            if (vSpan) vSpan.innerText = rawVer;
        }
    });
    let storedId = localStorage.getItem('buzz_userId');
    if (!storedId) { storedId = 'u_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5); localStorage.setItem('buzz_userId', storedId); }
    myUserID = storedId;
    typeWriterSequence();
    
    fetchActiveRooms();

    const urlParams = new URLSearchParams(window.location.search);
    const r = urlParams.get('room');
    if(r) { roomID = r; checkRoomAndStart(true); } else { navigateTo('step-room'); }
    
    renderAvatarGrid();
    
    const searchInput = document.getElementById('input-room-search');
    if(searchInput) {
        searchInput.addEventListener('keypress', (e)=>{
            if(e.key === 'Enter') {
                const firstCard = document.querySelector('#room-search-results .choice-card');
                if (firstCard) firstCard.click();
            }
        });
    }
    
    window.addEventListener('popstate', (event) => { if(stepHistory.length > 0) goBack(); });
    document.querySelectorAll('button:not([title]), .icon-btn:not([title])').forEach(b => {
        const txt = b.innerText.replace(/\s+/g, ' ').trim();
        if (txt) b.setAttribute('title', txt);
    });
};

function fetchActiveRooms() {
    db.ref('activeRooms').on('value', snap => {
        availableRooms = [];
        const rooms = snap.val();
        if(rooms) {
            Object.values(rooms).forEach(r => { availableRooms.push(r); });
        }
        availableRooms.sort((a,b) => (b.timestamp || 0) - (a.timestamp || 0));
        filterRooms(); 
    });
}

function filterRooms() {
    const query = document.getElementById('input-room-search').value.toLowerCase().trim();
    const container = document.getElementById('room-search-results');
    container.innerHTML = "";
    
    if(availableRooms.length === 0) {
        container.innerHTML = "<div style='text-align:center; color:#7f8c8d; font-style:italic; padding: 20px;'>Aucune partie en cours pour le moment.</div>";
        return;
    }

    let matches = availableRooms.filter(r => {
        const event = (r.eventName || "").toLowerCase();
        const mj = (r.mjName || "").toLowerCase();
        const id = (r.id || "").toLowerCase();
        return event.includes(query) || mj.includes(query) || id.includes(query);
    });

    if(matches.length === 0) {
        container.innerHTML = "<div style='text-align:center; color:#7f8c8d; font-style:italic; padding: 20px;'>Aucune salle ne correspond à ta recherche.</div>";
        return;
    }

    matches.forEach(r => {
        const div = document.createElement('div');
        div.className = "choice-card";
        div.style.padding = "15px";
        div.innerHTML = `
            <div class="choice-icon" style="font-size:1.8rem; margin-right:15px;">🎟️</div>
            <div class="choice-content" style="flex:1; overflow:hidden;">
                <b style="color:var(--accent); font-size:1.1rem; white-space:nowrap; text-overflow:ellipsis; overflow:hidden; display:block;">${r.eventName || "PARTIE EN COURS"}</b>
                <span style="color:#ecf0f1; font-size:0.85rem; display:block;">Animé par ${r.mjName || "Animateur"}</span>
            </div>
        `;
        div.onclick = () => { roomID = r.id; checkRoomAndStart(false); };
        container.appendChild(div);
    });
}

function navigateTo(targetId, pushToHistory = true) {
    if(html5QrCode) { try { html5QrCode.stop(); document.getElementById('reader').style.display='none'; } catch(e){} }
    const current = document.querySelector('.step-screen.active');
    if (pushToHistory) { history.pushState({ step: targetId }, "", "#" + targetId); if(current) stepHistory.push(current.id); }
    
    // --- RESET GLOBAL DES ÉTATS D'INTERFACE ---
    document.querySelectorAll('.gallery-container').forEach(g => g.style.display = 'none');
    document.querySelectorAll('.selection-mode-container').forEach(c => c.style.display = 'flex');
    document.getElementById('team-preview').style.display = 'none';

    // Reset spécifique du Pseudo (CRM et Warning)
    const pseudoChoice = document.getElementById('pseudo-choice-container');
    const pseudoNext = document.getElementById('btn-pseudo-next');
    const pseudoCancel = document.getElementById('btn-pseudo-cancel');
    const pseudoWarn = document.getElementById('pseudo-warning');
    if (pseudoChoice) pseudoChoice.style.display = 'none';
    if (pseudoWarn) pseudoWarn.style.display = 'none';
    if (pseudoNext) {
        pseudoNext.style.display = 'block';
        pseudoNext.innerText = isEditing ? "Enregistrer" : "Suivant";
    }
    if (pseudoCancel) pseudoCancel.style.display = isEditing ? "block" : "none";

    document.querySelectorAll('.step-screen').forEach(s => s.classList.remove('active'));
    document.getElementById(targetId).classList.add('active');
    updateBackButton(targetId);
}

function goBack() {
    if(isEditing) { finishEdit(true); return; }
    
    const currentScreen = document.querySelector('.step-screen.active');
    if (currentScreen && currentScreen.id === 'step-avatar') {
        // Règle spéciale : Depuis l'avatar, le bouton retour renvoie toujours au Pseudo
        document.getElementById('input-pseudo').value = player.pseudo;
        navigateTo('step-pseudo', false);
        return;
    }

    if(stepHistory.length === 0) return;
    if(teamListRef && teamListCallback) { teamListRef.off('value', teamListCallback); }
    const previous = stepHistory.pop(); navigateTo(previous, false); 
}

function updateBackButton(currentId) {
    const noBackScreens = ['step-room', 'step-welcome', 'step-game', 'step-recovery-wait'];
    document.getElementById('btn-back-global').style.display = noBackScreens.includes(currentId) ? 'none' : 'flex';
}

function startQRScan() {
    document.getElementById('reader').style.display = 'block';
    html5QrCode = new Html5Qrcode("reader");
    html5QrCode.start({ facingMode: "environment" }, { fps: 10, qrbox: 250 },
        (decodedText) => {
            html5QrCode.stop().then(() => {
                document.getElementById('reader').style.display = 'none';
                let match = decodedText.match(/[?&]room=([^&]+)/);
                if (match) { roomID = match[1]; checkRoomAndStart(false); } 
                else { alert("Code QR invalide pour ce jeu."); }
            });
        }, (errorMessage) => { })
    .catch(err => alert("Erreur caméra : " + err));
}

function showBannedScreen(mjName, mjLink) {
    const targetUrl = (mjLink && mjLink.startsWith('http')) ? mjLink : "https://tapni.com/app/djcedrik";
    const overlay = document.getElementById('overlay-warning');
    if(overlay) {
        overlay.innerHTML = `
            <div class="settings-content" onclick="event.stopPropagation()">
                <div style="font-size: 3.5rem; margin-bottom: 10px;">🟥</div>
                <h2 style="color:var(--danger); margin-top:0;">ACCÈS REFUSÉ</h2>
                <p style="color:#ccc; font-size:1rem; margin-bottom: 25px; line-height: 1.4;">
                    Vous avez été expulsé de la partie par <b>${mjName}</b>.<br><br>
                    Allez le voir pour qu'il vous réhabilite si vous souhaitez rejouer.
                </p>
                <button class="btn-main" onclick="window.location.replace('${targetUrl}')" style="width: 100%; background: var(--danger); color: white;">J'ai compris</button>
            </div>
        `;
        overlay.style.display = 'flex';
        if(roomRef) roomRef.off(); // Coupe la connexion pour empêcher les bugs
    }
}

function checkRoomAndStart(autoLogin) {
    db.ref('activeRooms/' + roomID).once('value', snap => {
        if(snap.exists()) {
            roomRef = db.ref('rooms/' + roomID);
            
           // 🚀 Écoute des règles du jeu en direct
            roomRef.child('settings').on('value', snap => {
                if(snap.exists()) roomSettings = snap.val();
                else roomSettings = { loginMode: 'full', gameMode: 'mixed', teamLock: 'individual', dayMode: false };
                
                // 🚀 NOUVEAU : VERROUILLAGE VISUEL DES MODES
                const cardSolo = document.getElementById('card-mode-solo');
                const cardTeam = document.getElementById('card-mode-team');
                if (cardSolo && cardTeam) {
                    if (roomSettings.gameMode === 'team_only') {
                        cardSolo.style.opacity = '0.4';
                        cardSolo.style.pointerEvents = 'none';
                        cardSolo.querySelector('span').innerText = 'Mode désactivé par l\'animateur';
                    } else {
                        cardSolo.style.opacity = '1';
                        cardSolo.style.pointerEvents = 'auto';
                        cardSolo.querySelector('span').innerText = 'Je joue pour ma gloire.';
                    }
                    if (roomSettings.gameMode === 'solo_only') {
                        cardTeam.style.opacity = '0.4';
                        cardTeam.style.pointerEvents = 'none';
                        cardTeam.querySelector('span').innerText = 'Mode désactivé par l\'animateur';
                    } else {
                        cardTeam.style.opacity = '1';
                        cardTeam.style.pointerEvents = 'auto';
                        cardTeam.querySelector('span').innerText = 'On gagne ensemble.';
                    }
                }
                if (typeof updateGameHeader === 'function') updateGameHeader();
                if (document.getElementById('overlay-settings').style.display === 'flex') openSettings();
                
                // 🚀 NOUVEAU : TÉLÉPORTATION EN LIVE (Si le MJ force les équipes et qu'on est en Solo)
                if (roomSettings.gameMode === 'team_only' && player && player.team === "Solo") {
                    const currentStep = document.querySelector('.step-screen.active');
                    if (currentStep && currentStep.id === 'step-game') {
                        alert("⚠️ L'animateur exige des équipes pour la suite !\nCrée ou rejoins un clan pour retourner au buzzer.");
                        document.getElementById('overlay-settings').style.display = 'none';
                        goToTeamAction();
                    }
                }
                
                // 🚀 PATCH V1.314 : RÉCEPTEUR MODE JOUR / STUDIO NUIT
                if (roomSettings.dayMode === true) {
                    document.body.classList.add('day-mode');
                    document.documentElement.style.setProperty('--bg', '#f1f5f9');
                    document.documentElement.style.setProperty('--card', '#ffffff');
                    document.documentElement.style.setProperty('--text', '#0f172a');
                    document.body.style.backgroundColor = 'var(--bg)';
                    document.body.style.color = 'var(--text)';
                } else {
                    document.body.classList.remove('day-mode');
                    document.documentElement.style.setProperty('--bg', '#090d16');
                    document.documentElement.style.setProperty('--card', 'rgba(23, 32, 53, 0.88)');
                    document.documentElement.style.setProperty('--text', '#ffffff');
                    document.body.style.backgroundColor = 'var(--bg)';
                    document.body.style.color = 'var(--text)';
                }
            });

            const lastRoom = localStorage.getItem('buzz_lastRoom');
            if(lastRoom !== roomID) { localStorage.removeItem('presta_player_session'); localStorage.setItem('buzz_lastRoom', roomID); autoLogin = false; }
            roomRef.child('mjName').once('value', s => { if(s.exists()) { mjName = s.val(); document.getElementById('welcome-mj-name').innerText = mjName.toUpperCase(); } });
            roomRef.child('mjLink').once('value', s => { if(s.exists()) mjLink = s.val(); });
			roomRef.child('mjLogo').once('value', s => { if(s.val()) { window.mjLogoUrl = s.val(); document.getElementById('mj-logo-welcome').src = s.val(); document.getElementById('mj-logo-welcome').style.display = 'block'; } });
            roomRef.child('library').on('value', snap => { roomLibrary = snap.val() || {}; if(document.getElementById('step-team-create').classList.contains('active')) renderTeamCrestPicker(); });

            const savedProfile = localStorage.getItem('buzz_lastProfile');
            if(!autoLogin && savedProfile) {
                try {
                    const p = JSON.parse(savedProfile);
                    // 🛡️ SÉCURITÉ 1 : Rejet du cache corrompu (undefined/null)
                    if(p.pseudo && p.avatar && p.pseudo !== "undefined" && p.pseudo !== "null") {
                        document.getElementById('reuse-pseudo-display').innerText = p.pseudo;
                        const avImg = document.getElementById('reuse-avatar-preview');
                        if(p.avatar.length > 20) { avImg.src = p.avatar; avImg.style.display='block'; } else { avImg.style.display='none'; }
                        document.getElementById('overlay-reuse').style.display = 'flex'; return;
                    } else {
                        localStorage.removeItem('buzz_lastProfile'); // Purge du cache
                    }
                } catch(e) {}
            }

            roomRef.child('players/' + myUserID).once('value', snapUser => {
                if(snapUser.exists()) {
                    const data = snapUser.val();
                    if(data.banned) { showBannedScreen(mjName, mjLink); return; }
                    
                    // 🛡️ SÉCURITÉ 2 : Destruction du joueur fantôme dans Firebase
                    if(!data.name || data.name === "undefined" || data.name === "null") {
                        snapUser.ref.remove();
                        localStorage.removeItem('presta_player_session');
                        myUserID = 'u_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
                        localStorage.setItem('buzz_userId', myUserID);
                        navigateTo('step-welcome');
                        return;
                    }

                    // 🚀 ÉTAPE 2 : LE SCAN DE LA SALLE (Recherche de conflit)
                    roomRef.child('players').once('value', allPlayersSnap => {
                        const allPlayers = allPlayersSnap.val() || {};
                        let conflictActive = false;

                        Object.keys(allPlayers).forEach(uid => {
                            if (uid !== myUserID && allPlayers[uid].name && allPlayers[uid].name.toLowerCase() === data.name.toLowerCase()) {
                                // Un autre joueur a le même pseudo
                                if (allPlayers[uid].active === true) {
                                    conflictActive = true;
                                }
                            }
                        });

                        if (conflictActive) {
                            // 🚨 SCÉNARIO ROUGE : Le pseudo est pris par un autre appareil actif
                            snapUser.ref.remove(); // On détruit la trace de ce téléphone dans Firebase
                            localStorage.removeItem('presta_player_session');
                            localStorage.removeItem('buzz_lastProfile');
                            
                            alert("⚠️ CONFLIT DE PSEUDO\n\nLe pseudo '" + data.name + "' est actuellement utilisé par un autre joueur dans la salle.\nTa session locale a été réinitialisée.");
                            
                            // On génère un nouvel ID pour que le téléphone B reparte de zéro
                            myUserID = 'u_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
                            localStorage.setItem('buzz_userId', myUserID);
                            player = { pseudo: "", avatar: "", team: "Solo", teamIcon: "" };
                            
                            navigateTo('step-welcome'); // On le renvoie à l'accueil
                        } else {
                            // ✅ SCÉNARIO VERT : Le pseudo est libre
                            player = { pseudo: data.name, avatar: data.avatar, team: data.teamName || "Solo", teamIcon: data.teamIcon || "" };
                            showReconnectScreen(); 
                        }
                    });
                    return;
                }
                navigateTo('step-welcome');
            });
        } else { 
            /* --- PATCH V1.187 : MESSAGE D'ERREUR CHALEUREUX ET DYNAMIQUE --- */
            db.ref('rooms/' + roomID + '/mjName').once('value', mjSnap => {
                if (mjSnap.exists()) {
                    // La salle existe mais est cachée (réseau coupé ou navigateur fermé)
                    alert("Salle fermée ou momentanément indisponible.\nVeuillez vous renseigner auprès de " + mjSnap.val() + ".");
                } else {
                    // La salle n'existe vraiment pas (ou a été définitivement supprimée)
                    alert("Salle introuvable ou définitivement supprimée.");
                }
                navigateTo('step-room');
            });
        }
    });
}

window.showReconnectScreen = function() {
    // 🚀 SÉCURITÉ ANTI-CLONAGE : Création du jeton du téléphone
    if (!window.mySessionID) window.mySessionID = Math.random().toString(36).substring(2, 15);

    if (myUserID && roomRef) {
        // 1. On déclare le joueur actif dans la salle
        roomRef.child('players/' + myUserID).update({
            active: true,
            recoveryRequest: null,
            reconnectedAt: firebase.database.ServerValue.TIMESTAMP
        });

        // 2. 🚀 LE RADAR D'ÉJECTION UNIQUE ET ABSOLU
        // On active cette sécurité uniquement pour les vrais comptes (pas les invités 'u_...')
        if (!myUserID.startsWith('u_')) {
            const sessionRef = firebase.database().ref('users_crm/' + myUserID + '/currentSessionID');
            
            // A) Le téléphone impose son jeton dans le dossier du joueur
            sessionRef.set(window.mySessionID).then(() => {
                
                // B) On allume l'écouteur permanent en temps réel
                sessionRef.on('value', snap => {
                    const activeSessionID = snap.val();
                    
                    // C) Si le jeton change et n'est plus le nôtre -> Éjection !
                    if (activeSessionID && activeSessionID !== window.mySessionID) {
                        sessionRef.off(); 
                        
                        // 🚀 RÉCUPÉRATION DU LIEN MJ AVANT DÉCONNEXION
                        roomRef.child('mjLink').once('value').then(snap => {
                            const linkVal = snap.val();
                            const targetUrl = (linkVal && linkVal.startsWith('http')) ? linkVal : "https://tapni.com/app/djcedrik";
                            
                            alert("⚠️ SESSION TRANSFÉRÉE\n\nCe compte est utilisé sur un autre appareil.\nRedirection vers le site de votre animateur...");

                            firebase.auth().signOut().then(() => {
                                localStorage.removeItem('buzz_userId');
                                localStorage.removeItem('buzz_lastProfile');
                                localStorage.removeItem('presta_player_session');
                                window.location.href = targetUrl; // 🔗 Redirection vers la promo du MJ
                            }).catch(() => {
                                localStorage.clear();
                                window.location.href = targetUrl;
                            });
                        });
                    }
                });
            });
        }
    }

    // --- GESTION DE L'AFFICHAGE DE L'ÉCRAN BON RETOUR ---
    document.getElementById('reconnect-pseudo-display').innerText = player.pseudo;
    const avImg = document.getElementById('reconnect-avatar-preview');
    if(player.avatar && player.avatar.length > 20) { 
        avImg.src = player.avatar; 
        avImg.style.display = 'block'; 
    } else { 
        avImg.style.display = 'none'; 
    }
    
    // Affichage intelligent du bouton de création de compte
    const guestBlock = document.getElementById('reconnect-guest-actions');
    if (guestBlock) {
        if (myUserID && myUserID.startsWith('u_') && roomSettings.loginMode !== 'quick') {
            guestBlock.style.display = 'block'; // C'est un invité en mode Full
        } else {
            guestBlock.style.display = 'none'; // C'est un compte CRM ou Mode Rapide
        }
    }
    
    navigateTo('step-reconnect');
};

function resumeGame() {
    roomRef.child('players/' + myUserID).once('value', snap => {
        logEvent('SYSTEM', `🔄 ${player.pseudo} s'est reconnecté à la partie`); // 🟢 CAPTEUR
        if(snap.exists()) { 
            snap.ref.update({ active: true }); 
        } else { 
            roomRef.child('players/' + myUserID).set({
                name: player.pseudo,
                teamName: "Solo",
                teamIcon: "",
                active: false, // 🚀 Reste gris jusqu'à la page buzzer
                banned: false
            });
        }
        launchGame(true);
    });
}

function modifyProfile() { document.getElementById('overlay-settings').style.display = 'flex'; }

function resetAndNewPlayer() {
    if(confirm("Attention : Vous allez perdre votre progression actuelle sur ce téléphone et un nouveau joueur sera créé.")) {
        if(roomRef && myUserID) {
            logEvent('SYSTEM', `🚪 ${player.pseudo} a réinitialisé son profil local`); // 🟢 CAPTEUR
            roomRef.child('players/' + myUserID).update({active: false});
        }
        myUserID = 'u_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
        localStorage.setItem('buzz_userId', myUserID); localStorage.removeItem('presta_player_session'); localStorage.removeItem('buzz_lastProfile');
        player = { pseudo: "", avatar: "", team: "Solo", teamIcon: "" }; navigateTo('step-welcome');
    }
}

function handleProfileReuse(reuse) {
    document.getElementById('overlay-reuse').style.display = 'none';
    if(reuse) {
        const p = JSON.parse(localStorage.getItem('buzz_lastProfile')); 
        const val = p.pseudo;
        
        roomRef.child('players').once('value', snap => {
            const players = snap.val() || {};
            let takenUid = null;
            let isInactive = false;
            let targetData = null;
            
            Object.keys(players).forEach(uid => {
                if(uid !== myUserID && players[uid].name && players[uid].name.toLowerCase() === val.toLowerCase()) {
                    takenUid = uid;
                    isInactive = (players[uid].active === false);
                    targetData = players[uid];
                }
            });
            
            if(takenUid) {
                if(!isInactive) {
                    alert(`Le pseudo "${val}" est actuellement utilisé par un autre joueur dans cette salle.\nVeuillez en choisir un autre.`);
                    document.getElementById('input-pseudo').value = val;
                    navigateTo('step-pseudo');
                    return;
                } else {
                    if (confirm(`Le profil "${val}" existe déjà mais est inactif.\nVoulez-vous demander à l'animateur de le récupérer ?`)) { 
                        startRecoveryProcess(takenUid, targetData); 
                    } else {
                        navigateTo('step-pseudo');
                    }
                    return;
                }
            }
            
            player.pseudo = val; 
            player.avatar = p.avatar; 
            window.handleModeRouting();
        });
    } else {
        if(roomRef && myUserID) roomRef.child('players/' + myUserID).update({active: false});
        myUserID = 'u_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
        localStorage.setItem('buzz_userId', myUserID); localStorage.removeItem('buzz_lastProfile');
        player = { pseudo: "", avatar: "", team: "Solo", teamIcon: "" }; navigateTo('step-welcome');
    }
}

// --- PATCH V1.226 : VIDEUR ANTI-CLONES + RÉCUPÉRATION MJ ---
function validatePseudo() {
    const val = document.getElementById('input-pseudo').value.trim();
    const regex = /^[a-zA-Z0-9À-ÿ\s\-_]+$/;
    if (!regex.test(val)) return alert("Caractères autorisés : Lettres, Chiffres, Espaces, Tirets (-), Underscore (_).");
    if(val.length < 2) return alert("Pseudo trop court !");
    
    const choiceContainer = document.getElementById('pseudo-choice-container');
    const nextBtn = document.getElementById('btn-pseudo-next');

    if (!roomRef) {
        // Pas de salle connectée
        if (myUserID && !myUserID.startsWith('u_') && window.crmPseudo && val !== window.crmPseudo) {
            choiceContainer.style.display = 'block';
            if (nextBtn) nextBtn.style.display = 'none';
        } else {
            if (isEditing) {
                player.pseudo = val; finishEdit(true);
            } else {
                finalizePseudoValidation(val);
            }
        }
        return;
    }

    roomRef.child('players').once('value', snap => {
        const players = snap.val() || {};
        let takenUid = null;
        let isInactive = false;
        let targetData = null;
        
        Object.keys(players).forEach(uid => {
            if(uid !== myUserID && players[uid].name && players[uid].name.toLowerCase() === val.toLowerCase()) {
                takenUid = uid;
                isInactive = (players[uid].active === false);
                targetData = players[uid];
            }
        });
        
        if(takenUid) {
            if (isEditing) { return alert("Ce pseudo est déjà pris."); }
            
            if(!isInactive) { 
                // 🚩 CAS 1 : Joueur EN LIGNE -> On propose maintenant la récupération pour déconnecter l'autre
                if(confirm("⚠️ CE JOUEUR EST DÉJÀ EN LIGNE\n\nLe pseudo '" + targetData.name + "' est actuellement en cours de partie sur un autre appareil.\n\nEst-ce bien vous ? (Cliquer sur OK lancera une demande de reconnexion et déconnectera l'autre appareil après validation du MJ).")) {
                    startRecoveryProcess(takenUid, targetData);
                } else {
                    suggestNewPseudo(val, "Veuillez utiliser un autre pseudo.");
                }
                return; 
            } else {
                // 🚩 CAS 2 : Joueur HORS LIGNE -> On propose la récupération MJ (Code existant)
                if (confirm("Ce profil existe déjà mais est inactif.\nVoulez-vous demander à l'animateur de le récupérer ?")) { 
                    startRecoveryProcess(takenUid, targetData); 
                } else {
                    // S'il refuse la récupération, on suggère l'année de naissance
                    suggestNewPseudo(val, "Veuillez utiliser un autre pseudo.");
                }
                return;
            }
        }
        
        // 🚀 NOUVEAU : La voie est libre, vérifions si on doit proposer la sauvegarde CRM
        alert("✅ Pseudo disponible ! Ton nouveau pseudo '" + val + "' est bien en place.");
        if (myUserID && !myUserID.startsWith('u_') && window.crmPseudo && val !== window.crmPseudo) {
            choiceContainer.style.display = 'block';
            if (nextBtn) nextBtn.style.display = 'none';
        } else {
            if (isEditing) {
                roomRef.child('players/' + myUserID).update({ name: val }); player.pseudo = val; finishEdit(true);
            } else {
                finalizePseudoValidation(val);
            }
        }
    });
}

// Le sous-moteur de suggestion (Année de naissance)
function suggestNewPseudo(baseVal, msgPrefix) {
    var suggestion = baseVal + Math.floor(10 + Math.random() * 90);
    if (myUserID) {
        firebase.database().ref('users_crm/' + myUserID).once('value').then(function(userSnap) {
            if (userSnap.exists() && userSnap.val().dob) {
                var annee = userSnap.val().dob.substring(0, 4);
                suggestion = baseVal + annee;
            }
            alert("⚠️ " + msgPrefix + "\nSuggestion : " + suggestion);
            document.getElementById('input-pseudo').value = suggestion;
        });
    } else {
        alert("⚠️ " + msgPrefix + "\nSuggestion : " + suggestion);
        document.getElementById('input-pseudo').value = suggestion;
    }
}

// Le sous-moteur de validation finale (Mise à jour Avatar)
function finalizePseudoValidation(val) {
    player.pseudo = val; 

    // 🚀 NOUVEAU : Attribution du Logo MJ par défaut si aucune photo n'est définie
    if (!player.avatar || player.avatar === "") {
        player.avatar = window.mjLogoUrl || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + val;
    }

    var preview = document.getElementById('avatar-preview');
    if(preview && player.avatar) { 
        if(player.avatar.length > 20) preview.innerHTML = `<img src="${player.avatar}" style="width:100%; height:100%; object-fit:cover;">`; 
        else preview.innerHTML = player.avatar; 
    }
    navigateTo('step-avatar');
}

function startRecoveryProcess(targetUid, data) {
    pendingRecoveryUid = targetUid;
    logEvent('SYSTEM', `🙋 ${data.name} a envoyé une demande de reconnexion`); // 🟢 CAPTEUR
    roomRef.child('players/' + targetUid).update({ recoveryRequest: true });
    
    navigateTo('step-recovery-wait');
    document.getElementById('recovery-name').innerText = data.name;
    
    recoveryRef = roomRef.child('players/' + targetUid);
    recoveryRef.on('value', snap => {
        const p = snap.val();
        if(!p) { cancelRecovery("Le profil a été supprimé par l'animateur."); return; }
        
        // 🚀 MODIFICATION : On attend que le MJ envoie le statut 'validated' (Laissez-passer)
        if(p.recoveryRequest === 'validated') {
            if(recoveryRef) recoveryRef.off();
            pendingRecoveryUid = null;
            
            // 🧹 NETTOYAGE : Le joueur a reçu l'autorisation, on efface la demande pour stopper la console MJ
            roomRef.child('players/' + targetUid).update({ recoveryRequest: null });
            
            // 🚀 DOUBLE SÉCURITÉ : On vérifie si l'utilisateur est déjà loggé sur Firebase
            const isAuth = firebase.auth().currentUser;
            if (isAuth && isAuth.uid === targetUid) {
                // Déjà connecté avec le bon compte -> Go !
                myUserID = targetUid;
                localStorage.setItem('buzz_userId', myUserID);
                player = { pseudo: p.name, avatar: p.avatar, team: p.teamName || "Solo", teamIcon: p.teamIcon || "" };
                showReconnectScreen();
            } else if (targetUid.startsWith('u_')) {
                // 🚀 PATCH V1.304 : Le joueur est un INVITE (Partie Rapide). Pas besoin de compte !
                myUserID = targetUid;
                localStorage.setItem('buzz_userId', myUserID);
                player = { pseudo: p.name, avatar: p.avatar, team: p.teamName || "Solo", teamIcon: p.teamIcon || "" };
                showReconnectScreen();
            } else {
                // Pas connecté et c'est un compte CRM -> Écran de verrouillage "Buzz Ta Puce"
                window.prepareSecureRecovery(targetUid, p);
            }
        }
    });
}

function cancelRecovery(msg) {
    if(recoveryRef) recoveryRef.off();
    if(pendingRecoveryUid) { 
        logEvent('SYSTEM', `❌ Demande de reconnexion annulée par le joueur`); // 🟢 CAPTEUR
        roomRef.child('players/' + pendingRecoveryUid).update({ recoveryRequest: null }); 
        pendingRecoveryUid = null; 
    }
    
    // 🚀 SÉCURITÉ : On vide le champ e-mail de la modale de login
    const loginEmailInput = document.getElementById('login-email');
    if(loginEmailInput) loginEmailInput.value = '';

    if(msg && typeof msg === 'string') alert(msg);
    navigateTo('step-pseudo', false);
}

// --- VARIABLES GLOBALES PARTAGÉES (Gestion Équipe Capitaine & Réauthentification) ---
let manageTeamRef = null;
let manageTeamCallback = null;
let blacklistRef = null;
let blacklistCallback = null;
let teamMembersData = [];
let teamBlacklistData = [];
let currentTeamFilter = 'actifs';
let actionAfterReauth = null;

