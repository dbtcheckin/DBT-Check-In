import React, { useState, useEffect, useRef } from 'react';

/**
 * DBT Voice Diary - Complete Prototype
 * 
 * Features:
 * 1. Two-phase diary capture (free voice → AI completion)
 * 2. AI as "Diary Card Completion Partner"
 * 3. Smart notification system
 * 4. Weekly skills review
 * 5. Pre-session prep summary
 * 6. Contextual skill surfacing
 */

const DBTDiaryCompleteApp = () => {
  const [screen, setScreen] = useState('home');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [currentPhase, setCurrentPhase] = useState(1); // 1 = voice, 2 = AI completion
  const [completionStep, setCompletionStep] = useState(0);
  const [showNotification, setShowNotification] = useState(null);
  
  // Diary data
  const [liveTranscript, setLiveTranscript] = useState('');
  const [extractedData, setExtractedData] = useState({});
  const [finalDiaryCard, setFinalDiaryCard] = useState({});
  const [audioLevel, setAudioLevel] = useState(0);
  
  // Week data for review/prep screens
  const [weekEntries, setWeekEntries] = useState([
    { day: 'Mon', complete: true, emotions: { anxiety: 3, anger: 4 }, skills: ['stop', 'tip'], urges: { self_harm: 1 } },
    { day: 'Tue', complete: true, emotions: { anxiety: 4, sadness: 3 }, skills: ['opposite_action'], urges: { self_harm: 2 } },
    { day: 'Wed', complete: true, emotions: { anxiety: 4, anger: 3 }, skills: ['check_facts', 'stop'], urges: { self_harm: 2 } },
    { day: 'Thu', complete: true, emotions: { anxiety: 2, joy: 3 }, skills: ['dear_man'], urges: { self_harm: 0 } },
    { day: 'Fri', complete: false, emotions: {}, skills: [], urges: {} },
    { day: 'Sat', complete: true, emotions: { joy: 4, anxiety: 1 }, skills: ['participate'], urges: { self_harm: 0 } },
    { day: 'Sun', complete: false, emotions: {}, skills: [], urges: {} },
  ]);

  // Simulated transcript for demo
  const demoTranscript = "Today was rough. Had another fight with my mom on the phone. I was so angry I wanted to scream. But I did use that STOP skill before I said something I'd regret. Did some breathing after. Felt like isolating all afternoon but made myself go to the grocery store instead. Still feeling pretty low tonight.";

  // AI-detected data from transcript
  const demoExtractedData = {
    emotions: { anger: 4, sadness: 3 },
    urges: {},
    skills: ['stop', 'tip_paced_breathing', 'opposite_action'],
    behaviors: { self_harm: false },
    context: ['fight with mom', 'wanted to isolate'],
    missing: ['emotion_intensity_anxiety', 'urges', 'anger_intensity_confirm'],
  };

  // AI completion questions
  const completionQuestions = [
    {
      id: 'anxiety_level',
      type: 'scale',
      question: "You mentioned feeling low and the fight was rough. Any anxiety today?",
      field: 'anxiety',
      options: [0, 1, 2, 3, 4, 5],
    },
    {
      id: 'urges',
      type: 'voice_or_tap',
      question: "Any urges come up today that were hard to manage?",
      field: 'urges',
      quickOptions: ['None today', 'Some urges'],
    },
    {
      id: 'urge_detail',
      type: 'scale',
      question: "How intense were the self-harm urges?",
      field: 'self_harm_urge',
      options: [0, 1, 2, 3, 4, 5],
      conditional: true,
    },
    {
      id: 'skill_confirm',
      type: 'confirm',
      question: "Making yourself go to the store when you wanted to isolate—that's Opposite Action. Should I log that?",
      field: 'skill_opposite_action',
      skill: 'opposite_action',
    },
    {
      id: 'acted_on_urges',
      type: 'binary',
      question: "Did you act on any urges today?",
      field: 'acted_on_urges',
      options: ['No', 'Yes'],
    },
  ];

  const skillDisplayNames = {
    'stop': 'STOP',
    'tip': 'TIP',
    'tip_paced_breathing': 'Paced Breathing',
    'tip_temperature': 'Cold Water',
    'opposite_action': 'Opposite Action',
    'check_facts': 'Check the Facts',
    'dear_man': 'DEAR MAN',
    'wise_mind': 'Wise Mind',
    'radical_acceptance': 'Radical Acceptance',
    'participate': 'Participate',
    'distract': 'Distract (ACCEPTS)',
  };

  const emotionColors = {
    anxiety: '#f59e0b',
    anger: '#ef4444',
    sadness: '#6366f1',
    fear: '#8b5cf6',
    shame: '#ec4899',
    joy: '#10b981',
  };

  // Timer effect
  useEffect(() => {
    let interval;
    if (isRecording) {
      interval = setInterval(() => setRecordingTime(t => t + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  // Simulate audio levels
  useEffect(() => {
    if (!isRecording) return;
    const interval = setInterval(() => {
      setAudioLevel(0.3 + Math.random() * 0.5);
    }, 100);
    return () => clearInterval(interval);
  }, [isRecording]);

  // Simulate transcript streaming
  useEffect(() => {
    if (!isRecording || screen !== 'recording') return;
    
    const words = demoTranscript.split(' ');
    let currentIndex = 0;
    
    const interval = setInterval(() => {
      if (currentIndex < words.length) {
        setLiveTranscript(prev => prev + (prev ? ' ' : '') + words[currentIndex]);
        currentIndex++;
      } else {
        clearInterval(interval);
      }
    }, 150);
    
    return () => clearInterval(interval);
  }, [isRecording, screen]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartRecording = () => {
    setIsRecording(true);
    setRecordingTime(0);
    setLiveTranscript('');
    setCurrentPhase(1);
    setCompletionStep(0);
    setExtractedData({});
    setScreen('recording');
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    // Simulate AI processing
    setTimeout(() => {
      setExtractedData(demoExtractedData);
      setCurrentPhase(2);
      setScreen('ai_completion');
    }, 1500);
  };

  const handleCompletionAnswer = (answer) => {
    // Store answer and move to next question
    const currentQ = completionQuestions[completionStep];
    setFinalDiaryCard(prev => ({
      ...prev,
      [currentQ.field]: answer
    }));
    
    if (completionStep < completionQuestions.length - 1) {
      setCompletionStep(prev => prev + 1);
    } else {
      // All questions answered, show final review
      setScreen('final_review');
    }
  };

  // ============================================
  // COMPONENT: Breathing Orb
  // ============================================
  const BreathingOrb = ({ level, isActive }) => {
    const baseSize = 120;
    const currentSize = baseSize + (level * 50);
    
    return (
      <div className="relative flex items-center justify-center">
        {[0.3, 0.5, 0.7].map((opacity, i) => (
          <div
            key={i}
            className="absolute rounded-full transition-all duration-150"
            style={{
              width: currentSize + (i * 30),
              height: currentSize + (i * 30),
              background: `radial-gradient(circle, rgba(99, 102, 241, ${opacity * level * 0.3}) 0%, transparent 70%)`,
            }}
          />
        ))}
        <div
          className="rounded-full transition-all duration-150 flex items-center justify-center"
          style={{
            width: currentSize,
            height: currentSize,
            background: isActive 
              ? `radial-gradient(circle at 30% 30%, #818cf8, #4f46e5, #3730a3)`
              : `radial-gradient(circle at 30% 30%, #6b7280, #4b5563, #374151)`,
            boxShadow: isActive 
              ? `0 0 ${20 + level * 40}px rgba(99, 102, 241, ${0.3 + level * 0.4})`
              : 'none',
          }}
        >
          <span className="text-4xl">🎙️</span>
        </div>
      </div>
    );
  };

  // ============================================
  // COMPONENT: Live Transcript
  // ============================================
  const LiveTranscript = ({ text }) => {
    const containerRef = useRef(null);
    
    useEffect(() => {
      if (containerRef.current) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
      }
    }, [text]);
    
    return (
      <div 
        ref={containerRef}
        className="max-h-32 overflow-y-auto text-gray-300 text-lg leading-relaxed"
      >
        {text || <span className="text-gray-500 italic">Start speaking about your day...</span>}
        {text && <span className="inline-block w-0.5 h-5 bg-indigo-400 ml-1 animate-pulse" />}
      </div>
    );
  };

  // ============================================
  // COMPONENT: Notification Card
  // ============================================
  const NotificationCard = ({ notification, onAction, onDismiss }) => {
    if (!notification) return null;
    
    const icons = {
      daily: '📝',
      weekly: '📊',
      prep: '📋',
      skill: '💡',
      streak: '🔥',
      gentle: '💙',
    };
    
    return (
      <div className="fixed top-4 left-4 right-4 z-50 animate-slide-down">
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-4 shadow-xl">
          <div className="flex items-start gap-3">
            <span className="text-2xl">{icons[notification.type]}</span>
            <div className="flex-1">
              <p className="text-white font-medium mb-1">{notification.title}</p>
              <p className="text-gray-400 text-sm">{notification.message}</p>
              {notification.actions && (
                <div className="flex gap-2 mt-3">
                  {notification.actions.map((action, i) => (
                    <button
                      key={i}
                      onClick={() => onAction(action)}
                      className={`px-3 py-1.5 rounded-lg text-sm ${
                        action.primary 
                          ? 'bg-indigo-600 text-white' 
                          : 'bg-gray-700 text-gray-300'
                      }`}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={onDismiss} className="text-gray-500 hover:text-gray-300">×</button>
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // SCREEN: Home
  // ============================================
  const HomeScreen = () => (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 p-6">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-light text-white">DBT Diary</h1>
            <p className="text-gray-500 text-sm mt-1">Sunday, January 19</p>
          </div>
          <button 
            onClick={() => setScreen('notifications_demo')}
            className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center relative"
          >
            <span className="text-gray-400">🔔</span>
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-500 rounded-full text-[10px] text-white flex items-center justify-center">2</span>
          </button>
        </div>

        {/* Main CTA */}
        <button 
          onClick={handleStartRecording}
          className="w-full bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-8 mb-6 shadow-2xl"
        >
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mb-4">
              <span className="text-4xl">🎙️</span>
            </div>
            <h2 className="text-xl font-medium text-white mb-1">Record Today's Entry</h2>
            <p className="text-indigo-200/70 text-sm">Speak freely—I'll help complete it</p>
          </div>
        </button>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button 
            onClick={() => setScreen('weekly_review')}
            className="bg-gray-800/50 rounded-xl p-4 text-left hover:bg-gray-800 transition-colors"
          >
            <span className="text-2xl mb-2 block">📊</span>
            <h3 className="text-white font-medium text-sm">Weekly Review</h3>
            <p className="text-gray-500 text-xs">5/7 days logged</p>
          </button>
          <button 
            onClick={() => setScreen('session_prep')}
            className="bg-gray-800/50 rounded-xl p-4 text-left hover:bg-gray-800 transition-colors"
          >
            <span className="text-2xl mb-2 block">📋</span>
            <h3 className="text-white font-medium text-sm">Session Prep</h3>
            <p className="text-gray-500 text-xs">Tomorrow at 3pm</p>
          </button>
        </div>

        {/* Week Progress */}
        <div className="bg-gray-800/50 rounded-2xl p-5 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-medium text-gray-400">This Week</h3>
            <span className="text-xs text-indigo-400">5/7 complete</span>
          </div>
          <div className="flex justify-between">
            {weekEntries.map((entry, i) => (
              <div key={i} className="flex flex-col items-center">
                <span className="text-xs text-gray-500 mb-2">{entry.day}</span>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  entry.complete 
                    ? 'bg-emerald-900/50 text-emerald-400' 
                    : 'bg-gray-700/50 text-gray-600'
                }`}>
                  {entry.complete ? '✓' : '○'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Skill Insight Card */}
        <div className="bg-indigo-900/30 border border-indigo-700/50 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <span className="text-xl">💡</span>
            <div>
              <p className="text-indigo-200 text-sm font-medium mb-1">Skill Insight</p>
              <p className="text-gray-400 text-sm">
                You've used STOP 3 times this week when anger spiked. 
                It seems to be helping with the conflicts.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ============================================
  // SCREEN: Phase 1 - Free Voice Recording
  // ============================================
  const RecordingScreen = () => (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-indigo-950/20 to-gray-950 p-6 flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <button 
          onClick={() => { setScreen('home'); setIsRecording(false); }}
          className="text-gray-400"
        >
          ← Cancel
        </button>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-red-400 text-sm">{formatTime(recordingTime)}</span>
        </div>
      </div>

      {/* Phase indicator */}
      <div className="flex items-center justify-center gap-2 mb-8">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-medium">1</div>
          <span className="text-white text-sm">Speak freely</span>
        </div>
        <div className="w-8 h-px bg-gray-700" />
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gray-700 text-gray-500 flex items-center justify-center text-sm">2</div>
          <span className="text-gray-500 text-sm">Quick follow-up</span>
        </div>
      </div>

      {/* Main visual */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <BreathingOrb level={audioLevel} isActive={isRecording} />
        <p className="text-gray-400 text-sm mt-6 text-center max-w-xs">
          Talk about your day naturally. I'll listen and ask a few quick questions after.
        </p>
      </div>

      {/* Live transcript */}
      <div className="bg-gray-800/50 backdrop-blur rounded-2xl p-4 mb-6">
        <LiveTranscript text={liveTranscript} />
      </div>

      {/* Stop button */}
      <button 
        onClick={handleStopRecording}
        className="w-full py-4 bg-gray-800 hover:bg-gray-700 rounded-2xl text-white font-medium flex items-center justify-center gap-2"
      >
        <div className="w-4 h-4 rounded bg-red-500" />
        Done Speaking
      </button>
    </div>
  );

  // ============================================
  // SCREEN: Phase 2 - AI Completion Partner
  // ============================================
  const AICompletionScreen = () => {
    const currentQ = completionQuestions[completionStep];
    const progress = ((completionStep + 1) / completionQuestions.length) * 100;
    
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-950 p-6 flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <button onClick={() => setScreen('home')} className="text-gray-400">← Cancel</button>
          <span className="text-gray-400 text-sm">
            {completionStep + 1} of {completionQuestions.length}
          </span>
        </div>

        {/* Phase indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center text-sm">✓</div>
            <span className="text-emerald-400 text-sm">Captured</span>
          </div>
          <div className="w-8 h-px bg-gray-700" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-medium">2</div>
            <span className="text-white text-sm">Quick follow-up</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-gray-800 rounded-full mb-8">
          <div 
            className="h-full bg-indigo-500 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* What was captured */}
        <div className="bg-gray-800/30 rounded-xl p-4 mb-6">
          <p className="text-gray-500 text-xs mb-2">✓ What I captured:</p>
          <div className="flex flex-wrap gap-2">
            {demoExtractedData.skills.map(skill => (
              <span key={skill} className="px-2 py-1 bg-emerald-900/50 text-emerald-300 rounded-full text-xs">
                {skillDisplayNames[skill]}
              </span>
            ))}
            {Object.entries(demoExtractedData.emotions).map(([emotion, value]) => (
              <span 
                key={emotion} 
                className="px-2 py-1 rounded-full text-xs"
                style={{ 
                  backgroundColor: `${emotionColors[emotion]}20`,
                  color: emotionColors[emotion]
                }}
              >
                {emotion} {value}/5
              </span>
            ))}
          </div>
        </div>

        {/* Current question */}
        <div className="flex-1 flex flex-col justify-center">
          <div className="bg-gray-800/50 rounded-2xl p-6 mb-6">
            <div className="flex items-start gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-indigo-600/20 flex items-center justify-center">
                <span className="text-xl">🤖</span>
              </div>
              <div className="flex-1">
                <p className="text-white text-lg leading-relaxed">
                  {currentQ.question}
                </p>
              </div>
            </div>

            {/* Answer options based on question type */}
            {currentQ.type === 'scale' && (
              <div className="flex justify-between gap-2">
                {currentQ.options.map(num => (
                  <button
                    key={num}
                    onClick={() => handleCompletionAnswer(num)}
                    className="flex-1 py-4 bg-gray-700 hover:bg-indigo-600 rounded-xl text-white font-medium transition-colors"
                  >
                    {num}
                  </button>
                ))}
              </div>
            )}

            {currentQ.type === 'binary' && (
              <div className="flex gap-3">
                {currentQ.options.map(option => (
                  <button
                    key={option}
                    onClick={() => handleCompletionAnswer(option)}
                    className="flex-1 py-4 bg-gray-700 hover:bg-indigo-600 rounded-xl text-white font-medium transition-colors"
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}

            {currentQ.type === 'confirm' && (
              <div className="flex gap-3">
                <button
                  onClick={() => handleCompletionAnswer(true)}
                  className="flex-1 py-4 bg-emerald-700 hover:bg-emerald-600 rounded-xl text-white font-medium transition-colors"
                >
                  Yes, log it ✓
                </button>
                <button
                  onClick={() => handleCompletionAnswer(false)}
                  className="flex-1 py-4 bg-gray-700 hover:bg-gray-600 rounded-xl text-white font-medium transition-colors"
                >
                  No, skip
                </button>
              </div>
            )}

            {currentQ.type === 'voice_or_tap' && (
              <div className="space-y-3">
                <div className="flex gap-3">
                  {currentQ.quickOptions.map(option => (
                    <button
                      key={option}
                      onClick={() => handleCompletionAnswer(option)}
                      className="flex-1 py-3 bg-gray-700 hover:bg-indigo-600 rounded-xl text-white text-sm transition-colors"
                    >
                      {option}
                    </button>
                  ))}
                </div>
                <button className="w-full py-3 bg-gray-800 border border-gray-700 rounded-xl text-gray-400 text-sm flex items-center justify-center gap-2">
                  <span>🎙️</span> Or tap to speak
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Skip option */}
        <button 
          onClick={() => handleCompletionAnswer(null)}
          className="text-gray-500 text-sm text-center py-2"
        >
          Skip this question
        </button>
      </div>
    );
  };

  // ============================================
  // SCREEN: Final Review
  // ============================================
  const FinalReviewScreen = () => (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-950 p-6">
      <div className="max-w-md mx-auto">
        <div className="flex justify-between items-center mb-6">
          <button onClick={() => setScreen('home')} className="text-gray-400">← Back</button>
        </div>

        {/* Success header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-emerald-900/50 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">✓</span>
          </div>
          <h2 className="text-xl font-medium text-white mb-2">Entry Complete</h2>
          <p className="text-gray-400 text-sm">Your diary card is ready for your therapist</p>
        </div>

        {/* Summary */}
        <div className="space-y-4 mb-8">
          {/* Transcript */}
          <div className="bg-gray-800/30 rounded-xl p-4">
            <p className="text-gray-500 text-xs mb-2">📝 What you shared:</p>
            <p className="text-gray-300 text-sm leading-relaxed">{demoTranscript}</p>
          </div>

          {/* Emotions */}
          <div className="bg-gray-800/50 rounded-xl p-4">
            <h3 className="text-white font-medium mb-3 flex items-center gap-2">
              <span className="text-emerald-400">✓</span> Emotions
            </h3>
            <div className="space-y-2">
              {[
                { name: 'Anger', value: 4, color: emotionColors.anger },
                { name: 'Anxiety', value: 3, color: emotionColors.anxiety },
                { name: 'Sadness', value: 3, color: emotionColors.sadness },
              ].map(e => (
                <div key={e.name} className="flex items-center gap-3">
                  <span className="text-gray-300 text-sm w-20">{e.name}</span>
                  <div className="flex-1 h-2 bg-gray-700 rounded-full">
                    <div 
                      className="h-full rounded-full" 
                      style={{ width: `${(e.value/5)*100}%`, backgroundColor: e.color }}
                    />
                  </div>
                  <span className="text-gray-400 text-sm w-8">{e.value}/5</span>
                </div>
              ))}
            </div>
          </div>

          {/* Urges */}
          <div className="bg-gray-800/50 rounded-xl p-4">
            <h3 className="text-white font-medium mb-3 flex items-center gap-2">
              <span className="text-emerald-400">✓</span> Urges
            </h3>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Self-harm urges</span>
              <span className="text-orange-400">2/5</span>
            </div>
            <div className="flex items-center gap-2 mt-2 text-emerald-400 text-sm">
              <span>✓</span>
              <span>Did not act on urges</span>
            </div>
          </div>

          {/* Skills */}
          <div className="bg-gray-800/50 rounded-xl p-4">
            <h3 className="text-white font-medium mb-3 flex items-center gap-2">
              <span className="text-emerald-400">✓</span> Skills Used
            </h3>
            <div className="flex flex-wrap gap-2">
              {['STOP', 'Paced Breathing', 'Opposite Action'].map(skill => (
                <span 
                  key={skill}
                  className="px-3 py-1.5 rounded-full text-sm bg-emerald-900/50 text-emerald-300 border border-emerald-700"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </div>

        <button 
          onClick={() => setScreen('home')}
          className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl text-white font-medium"
        >
          Save Entry
        </button>
      </div>
    </div>
  );

  // ============================================
  // SCREEN: Weekly Review
  // ============================================
  const WeeklyReviewScreen = () => {
    const [reviewStep, setReviewStep] = useState(0);
    
    const skillsThisWeek = [
      { skill: 'stop', count: 3, days: ['Mon', 'Wed', 'Wed'] },
      { skill: 'opposite_action', count: 2, days: ['Tue', 'Thu'] },
      { skill: 'tip', count: 2, days: ['Mon', 'Sat'] },
      { skill: 'check_facts', count: 1, days: ['Wed'] },
      { skill: 'dear_man', count: 1, days: ['Thu'] },
    ];

    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-950 p-6">
        <div className="max-w-md mx-auto">
          <div className="flex justify-between items-center mb-6">
            <button onClick={() => setScreen('home')} className="text-gray-400">← Back</button>
            <span className="text-gray-400 text-sm">Week of Jan 13-19</span>
          </div>

          <h2 className="text-xl font-medium text-white mb-6 flex items-center gap-2">
            <span>📊</span> Weekly Skills Review
          </h2>

          {/* Completion overview */}
          <div className="bg-gray-800/50 rounded-xl p-4 mb-6">
            <div className="flex justify-between items-center mb-3">
              <span className="text-gray-400 text-sm">Entries completed</span>
              <span className="text-white font-medium">5/7 days</span>
            </div>
            <div className="flex gap-1">
              {weekEntries.map((entry, i) => (
                <div 
                  key={i}
                  className={`flex-1 h-2 rounded-full ${
                    entry.complete ? 'bg-emerald-500' : 'bg-gray-700'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Skills detected */}
          <div className="bg-gray-800/50 rounded-xl p-4 mb-6">
            <h3 className="text-white font-medium mb-4">Skills I spotted this week</h3>
            <div className="space-y-3">
              {skillsThisWeek.map(item => (
                <div key={item.skill} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400">✓</span>
                    <span className="text-gray-300">{skillDisplayNames[item.skill]}</span>
                  </div>
                  <span className="text-gray-500 text-sm">{item.count}x</span>
                </div>
              ))}
            </div>
          </div>

          {/* AI question */}
          <div className="bg-indigo-900/30 border border-indigo-700/50 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-600/30 flex items-center justify-center">
                <span>🤖</span>
              </div>
              <div className="flex-1">
                <p className="text-white mb-3">
                  Were there other skills you used this week that I didn't catch?
                </p>
                <div className="flex gap-2">
                  <button className="px-3 py-2 bg-indigo-600 rounded-lg text-white text-sm">
                    Yes, add more
                  </button>
                  <button className="px-3 py-2 bg-gray-700 rounded-lg text-gray-300 text-sm">
                    That's all
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Struggles */}
          <div className="bg-gray-800/30 border border-gray-700 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
                <span>💭</span>
              </div>
              <div className="flex-1">
                <p className="text-gray-300 mb-3">
                  Any skills you wanted to use but couldn't? That's helpful for your therapist too.
                </p>
                <button className="px-3 py-2 bg-gray-700 rounded-lg text-gray-300 text-sm flex items-center gap-2">
                  <span>🎙️</span> Tap to share
                </button>
              </div>
            </div>
          </div>

          <button 
            onClick={() => setScreen('home')}
            className="w-full py-4 bg-gray-800 rounded-xl text-white font-medium"
          >
            Complete Review
          </button>
        </div>
      </div>
    );
  };

  // ============================================
  // SCREEN: Session Prep
  // ============================================
  const SessionPrepScreen = () => (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-950 p-6">
      <div className="max-w-md mx-auto">
        <div className="flex justify-between items-center mb-6">
          <button onClick={() => setScreen('home')} className="text-gray-400">← Back</button>
          <span className="text-gray-400 text-sm">Session tomorrow</span>
        </div>

        <h2 className="text-xl font-medium text-white mb-2 flex items-center gap-2">
          <span>📋</span> Session Prep
        </h2>
        <p className="text-gray-500 text-sm mb-6">Monday, Jan 20 at 3:00 PM</p>

        {/* Completion status */}
        <div className="bg-emerald-900/30 border border-emerald-700/50 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-3">
            <span className="text-2xl">✓</span>
            <div>
              <p className="text-emerald-300 font-medium">Diary card complete</p>
              <p className="text-gray-400 text-sm">5 of 7 days logged this week</p>
            </div>
          </div>
        </div>

        {/* Week highlights */}
        <div className="bg-gray-800/50 rounded-xl p-4 mb-4">
          <h3 className="text-white font-medium mb-4">📊 This Week's Patterns</h3>
          
          <div className="space-y-4">
            <div>
              <p className="text-gray-400 text-xs mb-2">EMOTIONS</p>
              <ul className="space-y-1 text-sm">
                <li className="text-gray-300">• Anxiety peaked Wednesday (4/5) after conflict</li>
                <li className="text-gray-300">• Anger elevated Mon-Wed, improved Thu-Sat</li>
                <li className="text-gray-300">• Joy highest on Saturday (4/5)</li>
              </ul>
            </div>
            
            <div>
              <p className="text-gray-400 text-xs mb-2">URGES</p>
              <ul className="space-y-1 text-sm">
                <li className="text-gray-300">• Self-harm urges present 4 days (max: 2/5)</li>
                <li className="text-emerald-400">• ✓ No urges acted on</li>
              </ul>
            </div>
            
            <div>
              <p className="text-gray-400 text-xs mb-2">SKILLS USED</p>
              <div className="flex flex-wrap gap-2 mt-1">
                <span className="px-2 py-1 bg-emerald-900/50 text-emerald-300 rounded text-xs">STOP (3x)</span>
                <span className="px-2 py-1 bg-emerald-900/50 text-emerald-300 rounded text-xs">Opposite Action (2x)</span>
                <span className="px-2 py-1 bg-emerald-900/50 text-emerald-300 rounded text-xs">TIP (2x)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Discussion topics */}
        <div className="bg-indigo-900/30 border border-indigo-700/50 rounded-xl p-4 mb-6">
          <h3 className="text-indigo-300 font-medium mb-3">💬 Possible Discussion Topics</h3>
          <ul className="space-y-2 text-sm">
            <li className="text-gray-300 flex items-start gap-2">
              <span className="text-indigo-400 mt-1">•</span>
              <span>Pattern: Mom conflicts → Anxiety spike → Anger</span>
            </li>
            <li className="text-gray-300 flex items-start gap-2">
              <span className="text-emerald-400 mt-1">•</span>
              <span>Win: Used Opposite Action twice when wanted to isolate</span>
            </li>
            <li className="text-gray-300 flex items-start gap-2">
              <span className="text-orange-400 mt-1">•</span>
              <span>Challenge: DEAR MAN attempt on Thursday felt hard</span>
            </li>
          </ul>
        </div>

        {/* Share options */}
        <div className="space-y-3">
          <button className="w-full py-4 bg-indigo-600 rounded-xl text-white font-medium flex items-center justify-center gap-2">
            <span>📤</span> Share with Therapist
          </button>
          <button className="w-full py-3 bg-gray-800 rounded-xl text-gray-300 text-sm">
            Download PDF
          </button>
        </div>
      </div>
    </div>
  );

  // ============================================
  // SCREEN: Notifications Demo
  // ============================================
  const NotificationsDemoScreen = () => {
    const notifications = [
      {
        type: 'daily',
        title: 'Daily Check-in',
        message: "Ready to capture today? Just speak naturally—I'll help fill in the rest.",
        time: '8:00 PM',
        actions: [
          { label: 'Record now', primary: true },
          { label: 'Remind later', primary: false },
        ],
      },
      {
        type: 'weekly',
        title: 'Weekly Skills Review',
        message: "You logged 5 entries this week. Quick review before your session?",
        time: 'Sundays 6:00 PM',
        actions: [
          { label: 'Review now', primary: true },
          { label: 'Later', primary: false },
        ],
      },
      {
        type: 'prep',
        title: 'Session Prep',
        message: "Session in 3 hours. Your diary's complete—here's your summary.",
        time: '3 hours before',
        actions: [
          { label: 'View summary', primary: true },
        ],
      },
      {
        type: 'skill',
        title: 'Skill Suggestion',
        message: "Noticed things have been intense. TIP skills can help in the moment.",
        time: 'Contextual',
        actions: [
          { label: 'View TIP', primary: true },
          { label: 'Not now', primary: false },
        ],
      },
      {
        type: 'gentle',
        title: 'Missed Entry',
        message: "Yesterday got away from you? Quick 60-second catch-up?",
        time: 'Next day 10 AM',
        actions: [
          { label: 'Catch up', primary: true },
          { label: 'Skip', primary: false },
        ],
      },
      {
        type: 'streak',
        title: 'Positive Reinforcement',
        message: "One week of daily entries. Your therapist will have great data.",
        time: 'After milestones',
        actions: [],
      },
    ];

    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-950 p-6">
        <div className="max-w-md mx-auto">
          <div className="flex justify-between items-center mb-6">
            <button onClick={() => setScreen('home')} className="text-gray-400">← Back</button>
          </div>

          <h2 className="text-xl font-medium text-white mb-2">Smart Notifications</h2>
          <p className="text-gray-500 text-sm mb-6">Examples of how the app will check in with you</p>

          <div className="space-y-4">
            {notifications.map((notif, i) => (
              <div key={i} className="bg-gray-800/50 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">
                    {notif.type === 'daily' && '📝'}
                    {notif.type === 'weekly' && '📊'}
                    {notif.type === 'prep' && '📋'}
                    {notif.type === 'skill' && '💡'}
                    {notif.type === 'gentle' && '💙'}
                    {notif.type === 'streak' && '🔥'}
                  </span>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-white font-medium">{notif.title}</p>
                      <span className="text-gray-500 text-xs">{notif.time}</span>
                    </div>
                    <p className="text-gray-400 text-sm mb-3">{notif.message}</p>
                    {notif.actions.length > 0 && (
                      <div className="flex gap-2">
                        {notif.actions.map((action, j) => (
                          <button
                            key={j}
                            className={`px-3 py-1.5 rounded-lg text-xs ${
                              action.primary 
                                ? 'bg-indigo-600 text-white' 
                                : 'bg-gray-700 text-gray-300'
                            }`}
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Settings hint */}
          <div className="mt-6 p-4 bg-gray-800/30 rounded-xl">
            <p className="text-gray-400 text-sm text-center">
              All notifications can be customized in Settings
            </p>
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // Render current screen
  // ============================================
  const renderScreen = () => {
    switch (screen) {
      case 'recording': return <RecordingScreen />;
      case 'ai_completion': return <AICompletionScreen />;
      case 'final_review': return <FinalReviewScreen />;
      case 'weekly_review': return <WeeklyReviewScreen />;
      case 'session_prep': return <SessionPrepScreen />;
      case 'notifications_demo': return <NotificationsDemoScreen />;
      default: return <HomeScreen />;
    }
  };

  return (
    <div className="font-sans antialiased">
      <style>{`
        @keyframes slide-down {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-down { animation: slide-down 0.3s ease-out; }
      `}</style>
      
      {showNotification && (
        <NotificationCard 
          notification={showNotification}
          onAction={(action) => {
            setShowNotification(null);
            // Handle action
          }}
          onDismiss={() => setShowNotification(null)}
        />
      )}
      
      {renderScreen()}
    </div>
  );
};

export default DBTDiaryCompleteApp;
