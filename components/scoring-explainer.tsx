import styles from "./group-page.module.css";

interface ScoringExplainerProps {
  compact?: boolean;
  enabled?: boolean;
}

export function ScoringExplainer({ compact = false, enabled = true }: ScoringExplainerProps) {
  return (
    <details className={compact ? styles.scoringExplainerCompact : styles.scoringExplainer}>
      <summary>
        <span className={styles.scoringQuestionMark} aria-hidden>
          ?
        </span>
        <span>
          {enabled
            ? "Como funciona el sistema de puntos"
            : "Sistema de puntos no activo en este grupo"}
        </span>
      </summary>

      <div className={styles.scoringExplainerBody}>
        {!enabled ? (
          <div className={styles.scoringExplainerNotice}>
            Este grupo guarda fixtures, pero no muestra ranking por puntos. Lucas puede
            activarlo desde el panel admin si quieren competir con esta regla.
          </div>
        ) : null}

        <div>
          <strong>Fase de grupos</strong>
          <p>
            +1 por cada seleccion que pronosticaste clasificada a 16avos y
            efectivamente clasifico. Si ademas acertaste su puesto exacto en el
            grupo, suma +2 extra.
          </p>
        </div>

        <div>
          <strong>Supervivencia en eliminatorias</strong>
          <p>
            Se compara que equipos llegan a cada instancia, sin importar el cruce
            exacto: 16avos +1, octavos +2, cuartos +3, semifinales +5 y finalistas
            +7 por equipo acertado.
          </p>
        </div>

        <div>
          <strong>Bonus finales</strong>
          <p>
            Final exacta +3, campeon +10 y ganador del tercer puesto +3. El ranking
            se actualiza cuando Lucas carga resultados reales desde el admin.
          </p>
        </div>
      </div>
    </details>
  );
}
