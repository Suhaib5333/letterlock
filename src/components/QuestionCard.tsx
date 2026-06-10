import { motion } from 'motion/react';
import type { TeamConfig, TeamId } from '../core/models';
import { play, speak } from '../services/audio';
import type { Served } from '../state/types';

interface Props {
  served: Served;
  answerRevealed: boolean;
  picker: TeamId;
  teams: Record<TeamId, TeamConfig>;
  tts: boolean;
  hideLetter?: boolean;
  onReveal: () => void;
  onSkip: () => void;
}

export function QuestionCard({
  served,
  answerRevealed,
  picker,
  teams,
  tts,
  hideLetter,
  onReveal,
  onSkip,
}: Props) {
  const pickerTeam = teams[picker];
  return (
    <motion.div
      className="qcard"
      data-testid="question-card"
      initial={{ opacity: 0, y: 24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="qcard-top">
        <div className={`letter-badge team-${picker}`} aria-hidden="true">
          {hideLetter ? '🚩' : served.letter}
        </div>
        <div className="qcard-meta">
          <div className="qcard-picker">
            <span className={`dot team-${picker}`} /> {pickerTeam.name} picked
          </div>
          <div className="qcard-rule">
            {hideLetter ? 'Name the country' : `Answer begins with “${served.letter}”`}
          </div>
        </div>
        {tts && (
          <button
            className="icon-btn"
            aria-label="Read question aloud"
            onClick={() => speak(served.question.q)}
          >
            🔊
          </button>
        )}
      </div>

      {served.question.image && (
        <div className="qcard-flag-wrap">
          <img
            className="qcard-flag"
            src={served.question.image}
            alt="Flag to identify"
            draggable={false}
          />
        </div>
      )}

      <p className="qcard-q" data-testid="question-text">
        {served.question.q}
      </p>

      <div className="qcard-answer">
        {answerRevealed ? (
          <motion.div
            className="answer-reveal"
            data-testid="answer-text"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <span className="answer-label">Answer</span>
            <span className="answer-value">{served.question.a}</span>
          </motion.div>
        ) : (
          <button
            className="btn btn-secondary"
            data-testid="reveal-answer"
            onClick={() => {
              play('reveal');
              onReveal();
            }}
          >
            Show answer
          </button>
        )}
        <button className="btn btn-ghost skip" data-testid="skip-question" onClick={onSkip}>
          ⏭ Skip question
        </button>
      </div>
    </motion.div>
  );
}
