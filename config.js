const APP_CONFIG = {
  // 🖼️ IMAGES ET LOGOS
  LOGO_URL: "https://static.wixstatic.com/media/eda9e4_e7ab6af2d5a7428f9bc7e4af454e20ef~mv2.png",
  LOGO_BUZTAPUCE: "https://static.wixstatic.com/media/eda9e4_dc2ff731fcff46ae864a10091fbab8c7~mv2.png",

  // 🎵 SONS
  SOUND_BUZZ: "https://static.wixstatic.com/mp3/eda9e4_b0c741f047f549a28051b8a2a2264f37.wav",
  SOUND_CHAMPION: "https://static.wixstatic.com/mp3/eda9e4_f7bb386482f54a2fb8f00a0c4ebe990d.mp3",
  SOUND_APPLAUSE: "https://static.wixstatic.com/mp3/eda9e4_a38a05892581432e9304fa03888211e3.mp3",

  // 🚀 CENTRALISATION DES VERSIONS
  VERSIONS: {
    CLIENT: "1.314", // Pour index.html
    APP: "1.301",    // Pour mj.html (Correctif Simulateur & Guidage v1.301)
    REMOTE: "1.165", // Pour remote.html
    SCORES: "1.188", // Pour scores.html
    GUIDE: "1.031"   // Pour guide.html
  }
};

/* ============================================================================
 * PATCH V1.301 — SIMULATEUR & GUIDAGE INTERACTIF CONSOLE MJ (mj.html)
 * S'active exclusivement sur mj.html (aucun effet sur index, remote, scores, guide).
 * Corrige :
 *  1. Étape 4/8 -> 5/8 : pause visuelle de 1,25 s sur le buzzer BLEU ("C'EST À TOI !"
 *     / "BIEN JOUÉ !") avec confirmation avant bascule vers l'arbitrage.
 *  2. Étape 5/8 : éclairage franc du cadre des points (#player-box) au-dessus du
 *     voile sombre (z-index + halo doré pulsé en mode Nuit & Jour).
 *  3. Étape 5/8 : décalage latéral intelligent de la modale (#tuto-tooltip) sur
 *     toutes les résolutions (PC portable 125%/150% inclus), sans jamais masquer
 *     les 5 buzzers en bas ni les 4 boutons de points.
 *  4. Navigation "⬅ Retour" / "Suivant ➔" : déblocage systématique du bouton
 *     "Suivant ➔" dès qu'on recule d'une étape + réouverture en VERT des buzzers
 *     lors d'un retour de 5/8 vers 4/8 pour permettre soit de re-buzzer, soit de
 *     cliquer sur "Suivant ➔" sans jamais rester bloqué.
 * ============================================================================ */
(function () {
  function initMjTutoPatchV1301() {
    const tooltip = document.getElementById('tuto-tooltip');
    const overlay = document.getElementById('tuto-overlay');
    const simuDock = document.getElementById('simu-phones-container');
    const playerBox = document.getElementById('player-box');

    // Sécurité stricte : ne s'exécute que dans mj.html
    if (!tooltip || !overlay || !simuDock || !playerBox) return;
    if (typeof window.startTuto !== 'function') return;

    // 1. Injection CSS haute priorité (éclairage #player-box, anti-chevauchement & visibilité buzzers)
    if (!document.getElementById('patch-mj-tuto-v1301')) {
      const style = document.createElement('style');
      style.id = 'patch-mj-tuto-v1301';
      style.textContent = `
        @keyframes tutoGoldPulseV1301 {
          0%, 100% {
            box-shadow: 0 0 0 4px #facc15, 0 0 32px rgba(250, 204, 21, 0.85), 0 18px 40px rgba(0, 0, 0, 0.8);
          }
          50% {
            box-shadow: 0 0 0 6px #fde047, 0 0 55px rgba(250, 204, 21, 1), 0 18px 48px rgba(0, 0, 0, 0.88);
          }
        }

        body.tuto-running .box:not(.tuto-highlight),
        body.tuto-running .dashboard > div:not(.tuto-highlight),
        body.tuto-running .dashboard > div > div:not(.tuto-highlight),
        body.tuto-running .current-player:not(.tuto-highlight),
        body.tuto-running .modal-box:not(.tuto-highlight) {
          backdrop-filter: none !important;
          z-index: auto !important;
          transform: none !important;
        }

        body.tuto-running #player-box.tuto-highlight {
          position: relative !important;
          z-index: 2000025 !important;
          pointer-events: auto !important;
          background: rgba(20, 29, 48, 0.98) !important;
          border: 3px solid #facc15 !important;
          border-radius: 16px !important;
          animation: tutoGoldPulseV1301 1.6s infinite ease-in-out !important;
        }

        body.day-mode.tuto-running #player-box.tuto-highlight {
          background: #ffffff !important;
          color: #0f172a !important;
          border: 3px solid #f59e0b !important;
        }

        body.tuto-running #player-box.tuto-highlight * {
          pointer-events: auto !important;
        }

        /* Sur écrans portables (900px à 1380px, ex: 1080p zoom 125% ou 150%),
           décale légèrement #player-box à gauche à l'étape 5/8 pour laisser
           la modale s'afficher proprement à sa droite sans rien recouvrir */
        @media (min-width: 900px) and (max-width: 1380px) {
          body.tuto-running.tuto-step-5 #player-box.tuto-highlight {
            max-width: 500px !important;
            margin-left: max(18px, calc(50% - 430px)) !important;
            margin-right: auto !important;
          }
        }

        body.tuto-running #btn-repair-network.tuto-highlight {
          background: rgba(20, 29, 48, 0.95) !important;
          padding: 4px 8px !important;
          border-radius: 8px !important;
          z-index: 2000025 !important;
          pointer-events: auto !important;
        }

        body.day-mode.tuto-running #btn-repair-network.tuto-highlight {
          background: #ffffff !important;
        }

        body.tuto-running #tuto-zone-rules.tuto-highlight {
          background: rgba(15, 23, 42, 0.94) !important;
          padding: 10px !important;
          border-radius: 12px !important;
        }

        body.day-mode.tuto-running #tuto-zone-rules.tuto-highlight {
          background: rgba(255, 255, 255, 0.97) !important;
        }

        #simu-phones-container.tuto-peek {
          position: fixed !important;
          bottom: 16px !important;
          left: 50% !important;
          transform: translateX(-50%) !important;
          z-index: 2000015 !important;
          pointer-events: none !important;
          box-shadow: 0 18px 45px rgba(0, 0, 0, 0.75) !important;
        }

        #simu-phones-container.tuto-highlight {
          position: fixed !important;
          bottom: 16px !important;
          left: 50% !important;
          transform: translateX(-50%) !important;
          z-index: 2000020 !important;
          pointer-events: auto !important;
        }

        #tuto-tooltip {
          z-index: 2000030 !important;
          pointer-events: auto !important;
        }
      `;
      document.head.appendChild(style);
    }

    // 2. État interne du contrôleur de guidage v1.301
    let patchHighestStep = { 0: 0, 1: 0, 2: 0 };
    let patchAdvanceTimer = null;
    let patchLastBuzzerUid = 't2';
    let patchListener = null;

    const stepsPhase0 = [
      {
        target: 'global-mj-logo-container',
        title: "👋 Votre Carte de Visite MJ",
        text: "Bienvenue dans <b>Buz'ta Puce</b> !<br><br>En cliquant sur ce logo animé, vous personnalisez votre nom d'animateur, votre logo pro, vos blasons et vos fonds d'écran."
      },
      {
        target: 'btn-choice-new-room',
        title: "🆕 Créer une Salle",
        text: "Cliquez maintenant sur <b>Créer une nouvelle salle</b> pour configurer votre premier événement d'entraînement.",
        autoAction: 'click'
      }
    ];

    const stepsPhase1 = [
      {
        target: 'new-room-mj',
        title: "🎤 Nom d'Animateur",
        text: "Votre prénom d'animateur est pré-rempli automatiquement et s'affichera sur les téléphones des invités."
      },
      {
        target: 'new-room-name',
        title: "🎉 Nom de l'Événement",
        text: "Tapez un nom d'événement (ex : <b>Soirée Test</b>) puis cliquez sur <b>Suivant</b>."
      },
      {
        target: 'new-room-login',
        title: "🔐 Parcours Joueurs",
        text: "<b>Complet :</b> Propose un compte fidélité.<br><b>Rapide :</b> Entrée immédiate avec un simple pseudo.<br><br><i>Choisissez une option ou cliquez sur Suivant.</i>"
      },
      {
        target: 'new-room-mode',
        title: "⚔️ Mode de Jeu",
        text: "En soirée réelle, choisissez entre <b>Mixte</b>, <b>100% Solo</b> ou <b>100% Équipes</b> (ici fixé sur Mixte pour l'entraînement)."
      },
      {
        target: 'new-room-team-lock',
        title: "🛑 Règle d'Erreur",
        text: "Décidez si une mauvaise réponse bloque <b>uniquement le joueur</b> ou <b>toute sa table</b>."
      },
      {
        target: 'btn-launch-room',
        title: "🚀 Ouvrir le Cockpit !",
        text: "Tout est prêt ! Cliquez sur <b>LANCER LA PARTIE</b> pour entrer en régie.",
        autoAction: 'click'
      }
    ];

    const stepsPhase2 = [
      {
        target: 'network-status-container',
        title: "📡 Sécurité Anti-Coupure",
        text: "Simulation : micro-coupure Wi-Fi (voyant 🔴) !<br><br><b>Cliquez sur le bouton 🔄 juste à droite</b> pour rouvrir instantanément l'accès à la salle.",
        overrideTarget: 'btn-repair-network',
        waitManualHook: true
      },
      {
        target: 'tuto-zone-rules',
        title: "☀️ Mode Jour & Règles",
        text: "Animation en plein soleil ? <b>Cliquez sur ☀️ MODE JOUR</b> : la console ET les <b>5 téléphones en bas</b> passent instantanément sur fond blanc !<br><br><i>Cliquez ensuite sur Suivant.</i>"
      },
      {
        target: 'tuto-zone-buzz',
        title: "🔊 Ouvrez les Buzzers !",
        text: "Lancez votre musique et <b>cliquez sur Ouvrir Buzzers</b> : les 5 buzzers en bas vont passer au <b>VERT lumineux (BUZZEZ !)</b>.",
        overrideTarget: 'btn-open-buzz',
        waitManualHook: true
      },
      {
        target: 'simu-phones-container',
        title: "⚡ Simulez un Joueur !",
        text: "Cliquez sur le buzzer vert d'un des <b>5 téléphones en bas</b> (ex : <b>Marie</b> ou <b>Ninja</b>) !<br><br>Il prendra la main en <b>Bleu (C'EST À TOI !)</b> et son coéquipier verra aussi <b>BIEN JOUÉ !</b>.",
        waitManualHook: true
      },
      {
        target: 'player-box',
        title: "⚖️ Arbitrage des Points",
        text: "Le cadre des points s'éclaire !<br>• <b>+3 / +1 (Terminé)</b> : attribue les points et referme les buzzers.<br>• <b>+1 (On continue)</b> : donne 1 pt, bloque ce joueur et <b>rouvre en vert</b> aux autres !<br>• <b>Erreur</b> : bloque ce joueur et rouvre aux autres.<br><br><b>Cliquez sur l'un des 4 boutons éclairés !</b>",
        waitManualHook: true
      },
      {
        target: 'tuto-zone-teams',
        title: "🛡️ Clans & Capitaines",
        text: "Déployez une équipe (flèche <b>▶</b>) pour voir ses membres, ajouter des bonus <b>+/-</b> ou transférer la couronne de Capitaine <b>👑</b>."
      },
      {
        target: 'tuto-zone-players',
        title: "👥 Modération Express",
        text: "Cliquez sur le menu <b>⋮</b> d'un joueur pour tester <b>Forcer le buzzer</b> (main levée), un <b>Carton Jaune 🟨</b>, l'<b>Expulsion 🟥</b> ou l'édition."
      },
      {
        target: null,
        title: "🎮 Mode Libre Débloqué !",
        text: "Le guidage est terminé : <b>toute la console est maintenant déverrouillée</b> !<br><br>Testez librement les 5 téléphones en bas, les règles et les scores. Cliquez sur <b>✖ Quitter le Bac à Sable</b> (ou <b>FIN DE PARTIE 🏆</b>) quand vous avez terminé."
      }
    ];

    function getSteps() {
      return tutoCurrentPhase === 0 ? stepsPhase0 : (tutoCurrentPhase === 1 ? stepsPhase1 : stepsPhase2);
    }

    function clearPendingTimer() {
      if (patchAdvanceTimer) {
        clearTimeout(patchAdvanceTimer);
        patchAdvanceTimer = null;
      }
    }

    function detachStepListener() {
      if (patchListener) {
        patchListener.el.removeEventListener(patchListener.type, patchListener.fn);
        patchListener = null;
      }
    }

    function activateSandboxPlayer(uid) {
      const validKeys = Object.keys(allPlayersData || {}).filter(k => allPlayersData[k] && !allPlayersData[k].banned);
      const chosenUid = (uid && allPlayersData[uid] && !allPlayersData[uid].banned) ? uid : (validKeys[0] || 't2');
      const p = allPlayersData[chosenUid];
      if (!p) return;

      patchLastBuzzerUid = chosenUid;
      currentGameState = 'taken';
      currentBuzzerId = chosenUid;
      currentPlayer = {
        id: chosenUid,
        name: p.name,
        pseudo: p.name,
        teamName: p.teamName,
        avatar: p.avatar
      };
      if (Array.isArray(buzzHistory) && !buzzHistory.includes(p.name)) {
        buzzHistory.push(p.name);
      }

      const btnOpenBuzz = document.getElementById('btn-open-buzz');
      if (btnOpenBuzz) {
        btnOpenBuzz.disabled = true;
        btnOpenBuzz.innerHTML = "🟢 BUZZERS OUVERTS";
      }

      playerBox.style.display = 'block';
      const pNameEl = document.getElementById('p-name');
      const pAvatarEl = document.getElementById('p-avatar');
      const pTeamEl = document.getElementById('p-team');

      if (pNameEl) pNameEl.innerText = p.name;
      if (pAvatarEl) {
        pAvatarEl.innerHTML = (p.avatar && p.avatar.length > 20)
          ? `<img src="${p.avatar}" style="width:70px; height:70px; border-radius:50%; object-fit:cover;">`
          : (p.avatar || '👤');
      }
      if (pTeamEl) {
        pTeamEl.innerHTML = (!p.teamName || p.teamName === 'Solo')
          ? 'Solo'
          : `<div class="crest-mini-bg"><img src="${(globalTeams && globalTeams[p.teamName]) ? globalTeams[p.teamName].icon : ''}" class="crest-mini"></div><span>${p.teamName}</span>`;
      }

      if (typeof window.updateSimuPhones === 'function') window.updateSimuPhones();
      if (typeof window.renderLobby === 'function') window.renderLobby();
      if (typeof window.renderTeamLobby === 'function') window.renderTeamLobby();
    }

    window.activateSandboxPlayerForStep5 = activateSandboxPlayer;

    function positionTooltipSmart(targetEl) {
      if (!tooltip || tooltip.style.display === 'none') return;
      tooltip.style.transform = 'none';

      const hasDock = (tutoCurrentPhase === 2 && simuDock && simuDock.style.display !== 'none');
      const dockTopViewport = hasDock ? simuDock.getBoundingClientRect().top : window.innerHeight;
      const maxBottomViewport = hasDock ? (dockTopViewport - 14) : (window.innerHeight - 15);
      const ttW = tooltip.offsetWidth || 325;
      const ttH = tooltip.offsetHeight || 220;

      const clampTopViewport = (vTop) => {
        const maxTop = Math.max(12, maxBottomViewport - ttH);
        return Math.min(Math.max(12, vTop), maxTop);
      };
      const clampLeft = (vLeft) => Math.min(Math.max(12, vLeft), Math.max(12, window.innerWidth - ttW - 12));

      if (!targetEl) {
        const availH = Math.max(220, maxBottomViewport);
        tooltip.style.top = Math.max(20, window.scrollY + (availH - ttH) / 2) + 'px';
        tooltip.style.left = clampLeft((window.innerWidth - ttW) / 2) + 'px';
        return;
      }

      const rect = targetEl.getBoundingClientRect();

      // Phase 1 (Modale Nouvelle Salle) : décalé à droite de la modale pour ne masquer aucun champ
      if (tutoCurrentPhase === 1) {
        const createBox = document.querySelector('#modal-create-room .modal-box');
        if (createBox) {
          const mRect = createBox.getBoundingClientRect();
          if (mRect.right + ttW + 20 <= window.innerWidth) {
            tooltip.style.left = (mRect.right + 18) + 'px';
            tooltip.style.top = (window.scrollY + clampTopViewport(Math.max(20, rect.top - 10))) + 'px';
            return;
          } else if (mRect.left - ttW - 20 >= 0) {
            tooltip.style.left = (mRect.left - ttW - 18) + 'px';
            tooltip.style.top = (window.scrollY + clampTopViewport(Math.max(20, rect.top - 10))) + 'px';
            return;
          }
        }
      }

      // Étape 4/8 : les 5 téléphones virtuels en bas -> modale juste au-dessus des téléphones
      if (targetEl.id === 'simu-phones-container') {
        tooltip.style.top = (window.scrollY + Math.max(12, rect.top - ttH - 16)) + 'px';
        tooltip.style.left = clampLeft((window.innerWidth - ttW) / 2) + 'px';
        return;
      }

      // Étape 5/8 : encart d'arbitrage #player-box -> TOUJOURS décalé sur le côté, JAMAIS sur les buzzers ni sur #player-box
      if (targetEl.id === 'player-box') {
        playerBox.style.marginTop = '';
        if (rect.right + ttW + 18 <= window.innerWidth) {
          tooltip.style.left = (rect.right + 16) + 'px';
          tooltip.style.top = (window.scrollY + clampTopViewport(Math.max(16, rect.top))) + 'px';
        } else if (rect.left - ttW - 18 >= 0) {
          tooltip.style.left = (rect.left - ttW - 16) + 'px';
          tooltip.style.top = (window.scrollY + clampTopViewport(Math.max(16, rect.top))) + 'px';
        } else {
          // Très petit écran (< 900px) : pousse #player-box sous la bulle sans toucher aux buzzers
          tooltip.style.left = clampLeft((window.innerWidth - ttW) / 2) + 'px';
          tooltip.style.top = (window.scrollY + 12) + 'px';
          playerBox.style.marginTop = (ttH + 22) + 'px';
        }
        return;
      }

      // Étape 6/8 : Lobby des Équipes (gauche) -> modale posée à droite
      if (targetEl.id === 'tuto-zone-teams' && rect.right + ttW + 20 <= window.innerWidth) {
        tooltip.style.left = (rect.right + 20) + 'px';
        tooltip.style.top = (window.scrollY + clampTopViewport(Math.max(20, rect.top))) + 'px';
        return;
      }

      // Étape 7/8 : Lobby Joueurs (droite) -> modale posée à gauche
      if (targetEl.id === 'tuto-zone-players' && rect.left - ttW - 20 >= 0) {
        tooltip.style.left = (rect.left - ttW - 20) + 'px';
        tooltip.style.top = (window.scrollY + clampTopViewport(Math.max(20, rect.top))) + 'px';
        return;
      }

      // Étape 3/8 : Zone Buzzers gauche -> modale juste à droite des 2 boutons
      if (targetEl.id === 'tuto-zone-buzz' && rect.right + ttW + 20 <= window.innerWidth) {
        tooltip.style.left = (rect.right + 18) + 'px';
        tooltip.style.top = (window.scrollY + clampTopViewport(Math.max(16, rect.top))) + 'px';
        return;
      }

      // Étape 2/8 : Zone Règles & Mode Jour -> décalé à droite de la carte salle si possible
      if (targetEl.id === 'tuto-zone-rules') {
        const roomCard = document.getElementById('room-info-card');
        if (roomCard) {
          const cRect = roomCard.getBoundingClientRect();
          if (cRect.right + ttW + 20 <= window.innerWidth) {
            tooltip.style.left = (cRect.right + 16) + 'px';
            tooltip.style.top = (window.scrollY + clampTopViewport(Math.max(16, rect.top - 10))) + 'px';
            return;
          }
        }
      }

      // Placement générique sécurisé (ne recouvre jamais #simu-phones-container)
      let vTop;
      if (rect.bottom + ttH + 18 <= maxBottomViewport) {
        vTop = rect.bottom + 14;
      } else if (rect.top - ttH - 18 >= 12) {
        vTop = rect.top - ttH - 14;
      } else {
        vTop = clampTopViewport(rect.bottom + 12);
      }
      tooltip.style.top = (window.scrollY + vTop) + 'px';
      tooltip.style.left = clampLeft(rect.left + (rect.width / 2) - (ttW / 2)) + 'px';
    }

    function scrollAndPositionSmart(targetEl) {
      const fixedTargets = ['simu-phones-container', 'top-right-tools', 'global-mj-logo-container'];
      const hasDock = (tutoCurrentPhase === 2 && simuDock && simuDock.style.display !== 'none');
      const dockH = hasDock ? (simuDock.offsetHeight + 28) : 20;
      const safeViewportH = window.innerHeight - dockH;

      if (targetEl && !fixedTargets.includes(targetEl.id) && tutoCurrentPhase !== 1) {
        const rawRect = targetEl.getBoundingClientRect();
        const absTop = rawRect.top + window.scrollY;
        let desiredScrollY = window.scrollY;

        if (targetEl.id === 'player-box') {
          desiredScrollY = Math.max(0, absTop - 65);
        } else if (targetEl.id === 'tuto-zone-teams' || targetEl.id === 'tuto-zone-players') {
          desiredScrollY = Math.max(0, absTop - 35);
        } else if (rawRect.top < 55 || rawRect.bottom > safeViewportH - 20) {
          desiredScrollY = Math.max(0, absTop - 75);
        }

        if (Math.abs(desiredScrollY - window.scrollY) > 8) {
          window.scrollTo({ top: desiredScrollY, behavior: 'auto' });
        }
      }

      // Double frame pour lire les dimensions exactes après application des classes CSS (.tuto-step-5)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => positionTooltipSmart(targetEl));
      });
    }

    window.positionTooltip = positionTooltipSmart;
    window.scrollAndPositionTooltip = scrollAndPositionSmart;

    function renderStep() {
      const steps = getSteps();
      const step = steps[tutoCurrentStep];
      if (!step) return;

      const hasVisitedLaterStep = tutoCurrentStep < (patchHighestStep[tutoCurrentPhase] || 0);

      if (typeof window.closeGlobalDropdown === 'function') window.closeGlobalDropdown();
      document.querySelectorAll('.tuto-highlight').forEach(el => el.classList.remove('tuto-highlight'));
      playerBox.style.marginTop = '';
      detachStepListener();

      const isStep5 = (tutoCurrentPhase === 2 && tutoCurrentStep === 4);
      document.body.classList.toggle('tuto-step-5', isStep5);

      // Garanties d'état visuel en Phase 2 (notamment après Retour / Suivant)
      if (tutoCurrentPhase === 2) {
        if (tutoCurrentStep === 3) {
          // Étape 4/8 : s'assure que les 5 buzzers sont bien VERTS ("BUZZEZ !") et cliquables
          if (currentGameState !== 'ready') {
            currentBlocked = {};
            if (typeof window.statusUpdate === 'function') window.statusUpdate('ready');
          }
        } else if (tutoCurrentStep === 4) {
          // Étape 5/8 : garantit que #player-box est affiché avec un joueur actif prêt à être arbitré
          if (currentGameState !== 'taken' || !currentPlayer || playerBox.style.display === 'none') {
            activateSandboxPlayer(patchLastBuzzerUid);
          }
        }

        if (simuDock) {
          if (step.target === 'simu-phones-container') {
            simuDock.classList.remove('tuto-peek');
          } else {
            simuDock.classList.add('tuto-peek');
          }
        }
      }

      // Mise à jour des textes et des boutons AVANT le calcul des dimensions de la modale
      const counterEl = document.getElementById('tuto-step-counter');
      if (counterEl) counterEl.innerText = `Étape ${tutoCurrentStep + 1} / ${steps.length}`;

      const btnPrev = document.getElementById('tuto-btn-prev');
      if (btnPrev) btnPrev.style.display = tutoCurrentStep > 0 ? 'inline-block' : 'none';

      const titleEl = document.getElementById('tuto-title');
      const textEl = document.getElementById('tuto-text');
      if (titleEl) titleEl.innerHTML = step.title;
      if (textEl) textEl.innerHTML = step.text;

      const btnNext = document.getElementById('tuto-btn-next');
      if (btnNext) {
        btnNext.innerText = (tutoCurrentStep === steps.length - 1)
          ? (tutoCurrentPhase === 2 ? "Jouer librement 🚀" : "Suivant ➔")
          : "Suivant ➔";

        btnNext.onclick = function () {
          clearPendingTimer();
          if (tutoCurrentPhase === 0 && tutoCurrentStep === 1) {
            if (typeof window.askMjNameAndCreate === 'function') window.askMjNameAndCreate();
            return;
          }
          if (tutoCurrentPhase === 1 && tutoCurrentStep === 1) {
            const eventInput = document.getElementById('new-room-name');
            if (eventInput && eventInput.value.trim() === '') eventInput.value = 'Soirée Démo';
          }
          if (tutoCurrentPhase === 1 && tutoCurrentStep === 5) {
            if (typeof window.confirmCreateRoom === 'function') window.confirmCreateRoom();
            return;
          }
          if (tutoCurrentPhase === 2) {
            if (tutoCurrentStep === 0) {
              const dot = document.getElementById('network-status-dot');
              if (dot) { dot.innerText = '🟢'; dot.classList.remove('pulse-alert'); }
            } else if (tutoCurrentStep === 2 && currentGameState === 'waiting') {
              currentBlocked = {};
              if (typeof window.statusUpdate === 'function') window.statusUpdate('ready');
            } else if (tutoCurrentStep === 3 && currentGameState !== 'taken') {
              activateSandboxPlayer(patchLastBuzzerUid);
            } else if (tutoCurrentStep === 4 && currentGameState === 'taken') {
              // Si on passe de 5/8 à 6/8 avec "Suivant ➔", referme proprement #player-box
              if (typeof window.statusUpdate === 'function') window.statusUpdate('waiting');
            }
          }
          window.nextTutoStep();
        };

        // Dès qu'une étape ultérieure a déjà été atteinte (après "⬅ Retour"), "Suivant ➔" reste TOUJOURS disponible !
        const shouldShowNext = hasVisitedLaterStep || (!step.autoAction && !step.waitManualHook);
        btnNext.style.display = shouldShowNext ? 'block' : 'none';
      }

      if (step.target) {
        const targetEl = document.getElementById(step.target);
        if (targetEl) {
          targetEl.classList.add('tuto-highlight');
          if (step.overrideTarget) {
            const overEl = document.getElementById(step.overrideTarget);
            if (overEl) overEl.classList.add('tuto-highlight');
          }

          if (step.autoAction) {
            const listenEl = step.overrideTarget ? document.getElementById(step.overrideTarget) : targetEl;
            if (listenEl) {
              const expectedPhase = tutoCurrentPhase;
              const expectedStep = tutoCurrentStep;
              const fn = () => {
                setTimeout(() => {
                  if (window.isTutoRunning && tutoCurrentPhase === expectedPhase && tutoCurrentStep === expectedStep) {
                    window.nextTutoStep();
                  }
                }, 250);
              };
              listenEl.addEventListener(step.autoAction, fn);
              patchListener = { el: listenEl, type: step.autoAction, fn: fn };
            }
          }

          scrollAndPositionSmart(targetEl);
        }
      } else {
        scrollAndPositionSmart(null);
      }
    }

    window.showTutoStep = renderStep;

    // 3. Commandes principales de navigation du tutoriel
    window.startTuto = function (phase, isForced = false) {
      const state = localStorage.getItem('mj_tuto_state_v3');
      if (!isForced) {
        if (phase === 0 && !state) {
          if (typeof window.showTutoPrompt === 'function') window.showTutoPrompt();
          return;
        } else if (state === 'done') {
          return;
        } else if (phase !== 0 && state !== 'accepted') {
          return;
        }
      } else if (phase === 0) {
        localStorage.setItem('mj_tuto_state_v3', 'accepted');
      }

      clearPendingTimer();
      detachStepListener();
      window.isTutoRunning = true;
      document.body.classList.add('tuto-running');
      tutoCurrentPhase = phase;
      tutoCurrentStep = 0;
      patchHighestStep[phase] = 0;

      overlay.style.display = 'block';
      tooltip.style.display = 'block';

      if (phase === 2) {
        window.isSandboxMode = true;
        document.body.classList.add('sandbox-active');
        if (typeof window.injectFakeTutoData === 'function') window.injectFakeTutoData();
        patchLastBuzzerUid = 't2';
        simuDock.style.display = 'flex';
        const dot = document.getElementById('network-status-dot');
        if (dot) {
          dot.innerText = '🔴';
          dot.classList.add('pulse-alert');
        }
      }

      renderStep();
    };

    window.prevTutoStep = function () {
      clearPendingTimer();
      if (tutoCurrentStep > 0) {
        // Assure que l'étape d'où l'on vient reste enregistrée comme visitée pour débloquer "Suivant ➔"
        if (tutoCurrentStep > (patchHighestStep[tutoCurrentPhase] || 0)) {
          patchHighestStep[tutoCurrentPhase] = tutoCurrentStep;
        }
        tutoCurrentStep--;

        if (tutoCurrentPhase === 2) {
          if (tutoCurrentStep === 0) {
            const dot = document.getElementById('network-status-dot');
            if (dot) { dot.innerText = '🔴'; dot.classList.add('pulse-alert'); }
          } else if (tutoCurrentStep === 2) {
            currentBlocked = {};
            if (typeof window.statusUpdate === 'function') window.statusUpdate('waiting');
          } else if (tutoCurrentStep === 3) {
            // Retour de 5/8 vers 4/8 : rouvre les buzzers en VERT pour pouvoir re-cliquer un téléphone OU faire "Suivant ➔"
            currentBlocked = {};
            if (typeof window.statusUpdate === 'function') window.statusUpdate('ready');
          }
        }

        renderStep();
      }
    };

    window.nextTutoStep = function () {
      clearPendingTimer();
      const steps = getSteps();
      tutoCurrentStep++;
      if (tutoCurrentStep > (patchHighestStep[tutoCurrentPhase] || 0)) {
        patchHighestStep[tutoCurrentPhase] = tutoCurrentStep;
      }

      if (tutoCurrentStep >= steps.length) {
        if (tutoCurrentPhase === 2) {
          window.unlockSandboxFreePlay();
        } else {
          document.body.classList.remove('tuto-running', 'tuto-step-5');
          tooltip.style.display = 'none';
          overlay.style.display = 'none';
        }
      } else {
        renderStep();
      }
    };

    window.unlockSandboxFreePlay = function () {
      clearPendingTimer();
      detachStepListener();
      window.isTutoRunning = false;
      document.body.classList.remove('tuto-running', 'tuto-step-5');
      playerBox.style.marginTop = '';
      overlay.style.display = 'none';
      tooltip.style.display = 'none';
      document.querySelectorAll('.tuto-highlight').forEach(el => el.classList.remove('tuto-highlight'));
      simuDock.classList.remove('tuto-peek', 'tuto-highlight');
    };

    window.endTuto = function () {
      clearPendingTimer();
      detachStepListener();
      const wasSandbox = window.isSandboxMode;
      window.isTutoRunning = false;
      window.isSandboxMode = false;
      document.body.classList.remove('tuto-running', 'sandbox-active', 'tuto-step-5');
      playerBox.style.marginTop = '';
      localStorage.setItem('mj_tuto_state_v3', 'done');
      overlay.style.display = 'none';
      tooltip.style.display = 'none';
      document.querySelectorAll('.tuto-highlight').forEach(el => el.classList.remove('tuto-highlight'));
      simuDock.classList.remove('tuto-peek', 'tuto-highlight');
      simuDock.style.display = 'none';
      if (wasSandbox && typeof window.clearFakeTutoData === 'function') {
        window.clearFakeTutoData();
      }
    };

    // 4. Simulation du clic sur un buzzer virtuel (Étape 4/8 & Mode Libre)
    window.simuClickBuzzer = function (uid) {
      if (!window.isSandboxMode) return;
      const p = allPlayersData ? allPlayersData[uid] : null;
      if (!p || p.banned) return;

      const isStep4 = (window.isTutoRunning && tutoCurrentPhase === 2 && tutoCurrentStep === 3);
      if (!isStep4 && currentGameState !== 'ready') return;
      if (currentBlocked && currentBlocked[p.name]) return;

      activateSandboxPlayer(uid);

      if (isStep4) {
        clearPendingTimer();
        const hasTeammate = p.teamName && p.teamName !== 'Solo' &&
          Object.keys(allPlayersData).some(k => k !== uid && allPlayersData[k].teamName === p.teamName && !allPlayersData[k].banned);
        const textEl = document.getElementById('tuto-text');
        if (textEl) {
          textEl.innerHTML = `✅ <b>${p.name}</b> a pris la main en <b>Bleu (C'EST À TOI !)</b>${hasTeammate ? " et son équipe voit <b>BIEN JOUÉ !</b>" : ""} !<br><br><i>Ouverture du cadre d'arbitrage des points...</i>`;
        }
        positionTooltipSmart(simuDock);

        // Pause visuelle confortable (1,25 s) pour admirer l'état bleu sur les buzzers avant l'étape 5/8
        patchAdvanceTimer = setTimeout(() => {
          patchAdvanceTimer = null;
          if (window.isTutoRunning && tutoCurrentPhase === 2 && tutoCurrentStep === 3) {
            window.nextTutoStep();
          }
        }, 1250);
      }
    };

    // 5. Enveloppes propres sur l'arbitrage (+3 / +1 / Erreur) et Forcer le Buzzer en mode Bac à Sable
    const origHandleReward = window.handleReward;
    window.handleReward = function (pts, mode) {
      if (!window.isSandboxMode) {
        return origHandleReward.apply(this, arguments);
      }
      if (!currentPlayer || !currentPlayer.id) return;
      const uid = currentPlayer.id;
      const pName = currentPlayer.name || currentPlayer.pseudo;
      if (allPlayersData[uid]) {
        allPlayersData[uid].pts = (allPlayersData[uid].pts || 0) + pts;
      }
      playerBox.classList.remove('tuto-highlight');
      playerBox.style.marginTop = '';
      if (mode === 'finish') {
        if (typeof window.statusUpdate === 'function') window.statusUpdate('waiting');
      } else {
        currentBlocked[pName] = true;
        if (typeof window.statusUpdate === 'function') window.statusUpdate('ready');
      }

      if (window.isTutoRunning && tutoCurrentPhase === 2 && tutoCurrentStep === 4) {
        clearPendingTimer();
        patchAdvanceTimer = setTimeout(() => {
          patchAdvanceTimer = null;
          if (window.isTutoRunning && tutoCurrentPhase === 2 && tutoCurrentStep === 4) {
            window.nextTutoStep();
          }
        }, 900);
      }
    };

    const origHandleError = window.handleError;
    window.handleError = function () {
      if (!window.isSandboxMode) {
        return origHandleError.apply(this, arguments);
      }
      if (!currentPlayer) return;
      const pName = currentPlayer.name || currentPlayer.pseudo;
      const isTeamLock = (window.roomSettings && window.roomSettings.teamLock === 'team') &&
        currentPlayer.teamName && currentPlayer.teamName !== 'Solo';

      if (isTeamLock) {
        Object.values(allPlayersData).forEach(pl => {
          if (pl.teamName === currentPlayer.teamName) currentBlocked[pl.name] = true;
        });
      } else {
        currentBlocked[pName] = true;
      }

      playerBox.classList.remove('tuto-highlight');
      playerBox.style.marginTop = '';
      if (typeof window.statusUpdate === 'function') window.statusUpdate('ready');

      if (window.isTutoRunning && tutoCurrentPhase === 2 && tutoCurrentStep === 4) {
        clearPendingTimer();
        patchAdvanceTimer = setTimeout(() => {
          patchAdvanceTimer = null;
          if (window.isTutoRunning && tutoCurrentPhase === 2 && tutoCurrentStep === 4) {
            window.nextTutoStep();
          }
        }, 900);
      }
    };

    const origForceBuzzer = window.forceBuzzer;
    if (typeof origForceBuzzer === 'function') {
      window.forceBuzzer = function (uid) {
        if (!window.isSandboxMode) {
          return origForceBuzzer.apply(this, arguments);
        }
        activateSandboxPlayer(uid);
        // Si testé à l'étape 7/8 (Modération), éclaire aussi #player-box et recale la bulle
        if (window.isTutoRunning && tutoCurrentPhase === 2 && tutoCurrentStep === 6) {
          playerBox.classList.add('tuto-highlight');
          const playersZone = document.getElementById('tuto-zone-players');
          if (playersZone) scrollAndPositionSmart(playersZone);
        }
      };
    }

    // Recalage automatique de la bulle si redimensionnement de fenêtre ou Plein Écran (F11)
    window.addEventListener('resize', () => {
      if (!window.isTutoRunning || tooltip.style.display === 'none') return;
      const steps = getSteps();
      const step = steps[tutoCurrentStep];
      if (!step) return;
      const targetEl = step.target ? document.getElementById(step.target) : null;
      positionTooltipSmart(targetEl);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMjTutoPatchV1301);
  } else {
    initMjTutoPatchV1301();
  }
})();
