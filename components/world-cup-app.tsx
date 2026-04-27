"use client";

import Link from "next/link";
import Image from "next/image";
import { startTransition, useEffect, useState } from "react";

import { createInitialFixtureState } from "@/lib/world-cup-fixture";
import { resolveGroupLinkInput } from "@/lib/group-utils";
import {
  clearPersistedFixtureState,
  loadFixtureStateFromBrowser,
  persistFixtureState,
} from "@/lib/world-cup-state";
import type { FixtureState } from "@/lib/world-cup-types";

import { FixtureBuilder } from "./fixture-builder";
import styles from "./world-cup-app.module.css";

type LoadSource = "empty" | "storage" | "url";

function getFirstIncompleteAnchor(fixtureState: FixtureState) {
  const thirdAssignmentCount = Object.keys(fixtureState.thirdPlaceAssignments).length;
  const allThirdSlotsReady =
    fixtureState.qualifiedThirdPlaces.length === 8 && thirdAssignmentCount === 8;

  if (fixtureState.qualifiedThirdPlaces.length < 8) {
    return "terceros";
  }

  if (!allThirdSlotsReady) {
    return "asignacion-terceros";
  }

  return "cuadro";
}

export function WorldCupApp() {
  const [fixtureState, setFixtureState] = useState<FixtureState>(createInitialFixtureState());
  const [loadSource, setLoadSource] = useState<LoadSource>("empty");
  const [hydrated, setHydrated] = useState(false);
  const [shareFeedback, setShareFeedback] = useState("");
  const [groupLinkInput, setGroupLinkInput] = useState("");
  const [groupLinkFeedback, setGroupLinkFeedback] = useState("");

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      const loaded = loadFixtureStateFromBrowser();
      setFixtureState(loaded.state);
      setLoadSource(loaded.source);
      setHydrated(true);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    persistFixtureState(fixtureState);
  }, [fixtureState, hydrated]);

  useEffect(() => {
    if (!shareFeedback && !groupLinkFeedback) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setShareFeedback("");
      setGroupLinkFeedback("");
    }, 2800);

    return () => window.clearTimeout(timeoutId);
  }, [groupLinkFeedback, shareFeedback]);

  const continueEditing = () => {
    document.getElementById(getFirstIncompleteAnchor(fixtureState))?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const copyShareUrl = async () => {
    const url = persistFixtureState(fixtureState);

    try {
      await navigator.clipboard.writeText(url);
      setShareFeedback("Link copiado al portapapeles.");
    } catch {
      setShareFeedback("No pude copiar el link automaticamente.");
    }
  };

  const startBuilding = () => {
    document.getElementById("grupos")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const viewOfficialBracket = () => {
    document.getElementById("cuadro-oficial")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const resetFixture = () => {
    clearPersistedFixtureState();
    startTransition(() => {
      setFixtureState(createInitialFixtureState());
      setLoadSource("empty");
      setShareFeedback("Fixture reiniciado.");
    });
  };

  const openGroupLink = () => {
    const nextPath = resolveGroupLinkInput(groupLinkInput);

    if (!nextPath) {
      setGroupLinkFeedback("Pegame un link valido de grupo.");
      return;
    }

    window.location.href = nextPath;
  };

  return (
    <div id="top" className={styles.pageShell}>
      <header className={styles.stickyHeader}>
        <a href="#top" className={styles.headerBrand}>
          <Image
            src="/official/wc26-logo.png"
            alt="FIFA World Cup 26"
            width={38}
            height={58}
            className={styles.headerBrandLogo}
          />
          <div>
            <strong>Fixture 2026</strong>
            <span>Mundial interactivo</span>
          </div>
        </a>

        <nav className={styles.headerNav} aria-label="Secciones principales">
          <a href="#grupos">Grupos</a>
          <a href="#terceros">Terceros</a>
          <a href="#cuadro">Cuadro</a>
        </nav>

        <button type="button" className={styles.headerAction} onClick={continueEditing}>
          Seguir donde ibas
        </button>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.brandRow}>
            <Image
              src="/official/wc26-logo.png"
              alt="FIFA World Cup 26"
              width={76}
              height={114}
              className={styles.wcLogo}
              priority
            />
            <Image
              src="/official/fifa-logo-white.png"
              alt="FIFA"
              width={164}
              height={54}
              className={styles.fifaLogo}
            />
          </div>

          <p className={styles.eyebrow}>Fixture interactivo oficial</p>
          <h1 className={styles.heroTitle}>Arma tu Mundial 2026 y segui el camino hasta la final</h1>
          <p className={styles.heroCopy}>
            Ordena los grupos, elegi los ocho mejores terceros y completa el cuadro con
            fechas, sedes y numeros de partido del calendario oficial FIFA.
          </p>

          <div className={styles.statRow}>
            <div className={styles.statCard}>
              <strong>48</strong>
              <span>selecciones</span>
            </div>
            <div className={styles.statCard}>
              <strong>12</strong>
              <span>grupos</span>
            </div>
            <div className={styles.statCard}>
              <strong>104</strong>
              <span>partidos</span>
            </div>
          </div>

          <div className={styles.heroActions}>
            <button type="button" className={styles.primaryAction} onClick={startBuilding}>
              ↓ Empezar a armar
            </button>
            <Link href="/tabla-general" className={styles.secondaryAction}>
              Tabla general
            </Link>
            <button
              type="button"
              className={styles.secondaryAction}
              onClick={viewOfficialBracket}
            >
              Ver cuadro oficial
            </button>
          </div>
        </div>

        <div className={styles.heroAside}>
          <div className={styles.heroPanel}>
            <p className={styles.heroPanelEyebrow}>Flujo guiado</p>
            <ol className={styles.heroPanelList}>
              <li>Defini el orden final de los 12 grupos.</li>
              <li>Elegi y ordena los 8 mejores terceros.</li>
              <li>Completa el bracket interactivo hasta el campeon.</li>
            </ol>
          </div>

          <div className={styles.heroPanelMuted}>
            <p className={styles.heroPanelEyebrow}>Tu avance</p>
            <strong>{fixtureState.qualifiedThirdPlaces.length}/8 terceros elegidos</strong>
            <span>El CTA principal te lleva directo al paso 1 para empezar.</span>
          </div>
        </div>
      </section>

      <section className={styles.infoStrip}>
        <div>
          <strong>Como funciona:</strong> en esta version ordenas el 1°, 2°, 3° y 4° de cada
          grupo, elegis los ocho mejores terceros y podes ajustar el tercero asignado a cada
          llave permitida.
        </div>
        <div>
          <strong>Reglamento base:</strong> pasan los dos primeros de cada grupo y ocho
          mejores terceros para completar los 16avos.
        </div>
      </section>

      <section className={styles.groupLaunchSection}>
        <article className={styles.groupLaunchCard}>
          <p className={styles.sectionEyebrow}>Ranking publico</p>
          <h2>Sumate a la tabla general</h2>
          <p>
            Guarda tu prediccion individual y competi en el ranking global cuando se
            carguen los resultados reales.
          </p>
          <Link href="/tabla-general" className={styles.primaryLinkButton}>
            Entrar a tabla general
          </Link>
        </article>

        <article className={styles.groupLaunchCard}>
          <p className={styles.sectionEyebrow}>Modo grupos</p>
          <h2>Crea un grupo para jugar con amigos</h2>
          <p>
            Genera un link compartible, define una fecha limite y deja que cada uno guarde
            su propio fixture sin crear cuenta.
          </p>
          <Link href="/grupos/nuevo" className={styles.primaryLinkButton}>
            Crear grupo
          </Link>
        </article>

        <article className={styles.groupLaunchCard}>
          <p className={styles.sectionEyebrow}>Ya te invitaron</p>
          <h2>Unite con el link del grupo</h2>
          <p>Pega un link completo o solo el slug del grupo y te llevamos directo.</p>
          <div className={styles.groupLinkRow}>
            <input
              type="text"
              value={groupLinkInput}
              onChange={(event) => setGroupLinkInput(event.target.value)}
              placeholder="https://... o hueco-a7f2"
            />
            <button type="button" className={styles.secondaryAction} onClick={openGroupLink}>
              Abrir grupo
            </button>
          </div>
          {groupLinkFeedback ? (
            <p className={styles.groupLinkFeedback}>{groupLinkFeedback}</p>
          ) : null}
        </article>
      </section>

      <section id="cuadro-oficial" className={styles.previewSection}>
        <div className={styles.previewHeader}>
          <div>
            <p className={styles.sectionEyebrow}>Referencia visual</p>
            <h2>Cuadro oficial del torneo con mejor lectura</h2>
          </div>
          <p className={styles.sectionHint}>
            Esta imagen queda como apoyo visual del formato FIFA. El cuadro editable e
            interactivo esta en el paso 4, mas abajo.
          </p>
        </div>

        <div className={styles.previewFrame}>
          <Image
            src="/official/fwc26-bracket.jpg"
            alt="Grafico oficial del cuadro de cruces del Mundial 2026"
            fill
            className={styles.previewImage}
            sizes="100vw"
          />
        </div>
      </section>

      <section className={styles.utilityBar} aria-label="Acciones de fixture">
        <div className={styles.actions}>
          <button type="button" className={styles.secondaryAction} onClick={copyShareUrl}>
            Copiar link
          </button>
          <button type="button" className={styles.secondaryAction} onClick={continueEditing}>
            Seguir editando
          </button>
          <button type="button" className={styles.secondaryAction} onClick={resetFixture}>
            Reiniciar
          </button>
        </div>

        <div className={styles.statusRow}>
          {loadSource === "url" ? (
            <p className={styles.statusPill}>Abriste un fixture compartido.</p>
          ) : null}
          {loadSource === "storage" ? (
            <p className={styles.statusPill}>Recuperamos tu ultimo fixture guardado.</p>
          ) : null}
          {shareFeedback ? <p className={styles.statusPill}>{shareFeedback}</p> : null}
        </div>
      </section>

      <FixtureBuilder
        fixtureState={fixtureState}
        onFixtureStateChange={setFixtureState}
      />
    </div>
  );
}
