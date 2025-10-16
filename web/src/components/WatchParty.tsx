import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import tokens from '@tokens/colors.json';
import {
  createWatchParty,
  joinWatchParty,
  updateWatchPartyState,
  leaveWatchParty,
  subscribeToWatchParty,
  type WatchParty,
  type TrailerDoc
} from '../firebaseFirestore';
import type { User } from '../firebaseAuth';

// Chat message type
type ChatMessage = {
  id: string;
  userId: string;
  displayName: string;
  platform: string;
  message: string;
  timestamp: any;
};

type WatchPartyProps = {
  user: User;
  currentContent: TrailerDoc | null;
  videoRef: React.MutableRefObject<HTMLVideoElement | null>;
  showMenu?: boolean;
  onMenuClose?: () => void;
  onPartyStateChange?: (inParty: boolean, partyId?: string) => void;
  onWatchFullMovie?: (videoUrl: string) => void;
  overlayRoot?: HTMLElement | null;
  partyId?: string | null; // Allow parent to pass in party ID to maintain across view transitions
};

export default function WatchPartyComponent({
  user,
  currentContent,
  videoRef,
  showMenu: externalShowMenu,
  onMenuClose,
  onPartyStateChange,
  onWatchFullMovie,
  overlayRoot,
  partyId: externalPartyId
}: WatchPartyProps) {
  const [internalShowMenu, setInternalShowMenu] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [party, setParty] = useState<WatchParty | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previousParticipantCount, setPreviousParticipantCount] = useState(0);
  const [joinNotification, setJoinNotification] = useState<string | null>(null);

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatPollInterval = useRef<number | null>(null);
  const autoOpenedChatRef = useRef(false);

  // Use external showMenu if provided, otherwise use internal state
  const showMenu = externalShowMenu !== undefined ? externalShowMenu : internalShowMenu;
  const setShowMenu = onMenuClose
    ? (value: boolean) => { if (!value) onMenuClose(); }
    : setInternalShowMenu;

  // Subscribe to party using externalPartyId (if provided by parent)
  useEffect(() => {
    if (!externalPartyId || party?.id === externalPartyId) return;

    console.log('[WatchParty] Subscribing to external party ID:', externalPartyId);

    const unsubscribe = subscribeToWatchParty(externalPartyId, (updatedParty) => {
      if (!updatedParty) {
        console.log('[WatchParty] External party ended');
        setParty(null);
        setIsHost(false);
        onPartyStateChange?.(false);
        return;
      }

      console.log('[WatchParty] External party updated:', updatedParty.status);
      setParty(updatedParty);
      setIsHost(updatedParty.hostUserId === user.uid);
      setPreviousParticipantCount(updatedParty.participants.length);
      syncVideoWithParty(updatedParty);
    });

    return unsubscribe;
  }, [externalPartyId, user.uid]);

  // Subscribe to party updates
  useEffect(() => {
    if (!party) return;

    const unsubscribe = subscribeToWatchParty(party.id, (updatedParty) => {
      if (!updatedParty) {
        // Party ended
        setParty(null);
        setIsHost(false);
        onPartyStateChange?.(false, undefined);
        return;
      }

      // Notify host when someone joins and ensure modal is open
      if (isHost && updatedParty.participants.length > previousParticipantCount) {
        const newParticipant = updatedParty.participants[updatedParty.participants.length - 1];
        // Keep modal open so host can see the Start button
        setShowCreateModal(true);
        // Show notification banner
        setJoinNotification(`${newParticipant.displayName} joined!`);
        // Auto-hide notification after 3 seconds
        setTimeout(() => setJoinNotification(null), 3000);
      }
      setPreviousParticipantCount(updatedParty.participants.length);

      setParty(updatedParty);
      syncVideoWithParty(updatedParty);
    });

    return unsubscribe;
  }, [party?.id, isHost, previousParticipantCount]);

  useEffect(() => {
    if (!party) {
      autoOpenedChatRef.current = false;
      setShowChat(false);
      console.log('[WatchParty] No party, hiding chat');
      return;
    }

    // Auto-show and keep chat open when party is playing
    if (party.status === 'playing') {
      console.log('[WatchParty] Party is playing, showing chat!');
      setShowChat(true);
      autoOpenedChatRef.current = true;
    } else {
      console.log('[WatchParty] Party status:', party.status);
    }
  }, [party?.status, party]);

  // Sync video playback with party state
  const syncVideoWithParty = (partyState: WatchParty) => {
    // CRITICAL: Only navigate to full movie if status is 'playing' AND modal is currently showing
    // This prevents automatic navigation when guest first joins (they should see lobby first)
    if (partyState.status === 'playing' && partyState.videoUrl && onWatchFullMovie && showCreateModal) {
      console.log('Party started! Navigating to full movie:', partyState.videoUrl);
      onWatchFullMovie(partyState.videoUrl);
      setShowCreateModal(false);
      return;
    }

    // If in lobby (waiting), pause the video for guests and ensure modal is visible
    if (partyState.status === 'waiting' && !isHost && videoRef.current) {
      const video = videoRef.current;
      if (!video.paused) {
        video.pause();
      }
      // Ensure lobby modal is visible for guests waiting
      if (!showCreateModal) {
        setShowCreateModal(true);
      }
      return;
    }

    // For ongoing playback sync (participants only)
    if (isHost || !videoRef.current) return;

    const video = videoRef.current;

    // Sync play/pause
    if (partyState.status === 'playing' && video.paused) {
      video.play().catch(err => console.error('Error playing video:', err));
    } else if (partyState.status === 'paused' && !video.paused) {
      video.pause();
    }

    // Sync timestamp (allow 3-second drift)
    const currentTime = video.currentTime;
    const drift = Math.abs(currentTime - partyState.currentTime);

    if (drift > 3 && partyState.status === 'playing') {
      video.currentTime = partyState.currentTime;
    }
  };

  // Host: Update party state every 5 seconds (ONLY when party is already playing)
  useEffect(() => {
    if (!party || !isHost || !videoRef.current) return;

    // Don't update if still in lobby (status is 'waiting')
    if (party.status === 'waiting') return;

    const interval = setInterval(() => {
      const video = videoRef.current;
      if (!video) return;

      const currentTime = video.currentTime;
      const playbackStatus = video.paused ? 'paused' : 'playing';

      updateWatchPartyState(party.id, playbackStatus as any, currentTime).catch(err =>
        console.error('Error updating party state:', err)
      );
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [party, isHost]);

  const handleCreateParty = async () => {
    if (!currentContent) {
      alert('No video is currently playing');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const newParty = await createWatchParty(
        user.uid,
        user.email || 'Anonymous',
        'web',
        currentContent
      );

      setParty(newParty);
      setIsHost(true);
      setPreviousParticipantCount(1); // Initialize with host count
      setShowCreateModal(true);
      setShowMenu(false);
      onPartyStateChange?.(true, newParty.id);
    } catch (err: any) {
      setError(err.message || 'Failed to create party');
      alert(err.message || 'Failed to create party');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinParty = async () => {
    if (!joinCode.trim()) {
      alert('Please enter a party code');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const joinedParty = await joinWatchParty(
        joinCode.trim().toUpperCase(),
        user.uid,
        user.email || 'Anonymous',
        'web'
      );

      setParty(joinedParty);
      setIsHost(false);
      setPreviousParticipantCount(joinedParty.participants.length);
      setShowJoinModal(false);
      setShowMenu(false);
      setJoinCode('');
      setShowCreateModal(true); // Show lobby for guests
      onPartyStateChange?.(true, joinedParty.id);

      // Don't show alert - guest stays in lobby modal and sees "Waiting for host..."
    } catch (err: any) {
      setError(err.message || 'Failed to join party');
      alert(err.message || 'Failed to join party');
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveParty = async () => {
    if (!party) return;

    const message = isHost
      ? 'Are you sure? This will end the party for everyone.'
      : 'Are you sure you want to leave?';

    if (!confirm(message)) return;

    try {
      await leaveWatchParty(party.id, user.uid);
      setParty(null);
      setIsHost(false);
      setShowCreateModal(false);
      onPartyStateChange?.(false, undefined);
    } catch (err) {
      console.error('Error leaving party:', err);
    }
  };

  const handleShareCode = async () => {
    if (!party) return;

    const shareText = `Join my Story Scout watch party!\n\nCode: ${party.code}\nWatching: ${party.contentTitle}\n\nEnter this code in the app to watch together!`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Watch Party Invitation',
          text: shareText
        });
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(shareText);
        alert('Party code copied to clipboard!');
      }
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };

  const handleStartWatchParty = async () => {
    if (!party || !isHost) return;

    try {
      // Start the full movie for everyone
      await updateWatchPartyState(party.id, 'playing', 0);

      // Navigate to full movie view
      if (party.videoUrl && onWatchFullMovie) {
        onWatchFullMovie(party.videoUrl);
      }

      setShowCreateModal(false);
    } catch (err) {
      console.error('Error starting watch party:', err);
      alert('Failed to start watch party');
    }
  };

  // Chat functions
  const fetchMessages = async () => {
    if (!party) return;

    try {
      const response = await fetch(
        `https://us-central1-story-scout.cloudfunctions.net/getChatMessages?partyCode=${party.code}&limit=50`
      );
      const data = await response.json();

      if (data.success && data.messages) {
        setMessages(data.messages);
        // Auto-scroll to bottom
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  };

  const sendMessage = async () => {
    if (!party || !messageInput.trim() || sendingMessage) return;

    const trimmedMessage = messageInput.trim();
    if (trimmedMessage.length > 200) {
      alert('Message too long (max 200 characters)');
      return;
    }

    setSendingMessage(true);

    try {
      const response = await fetch(
        'https://us-central1-story-scout.cloudfunctions.net/sendChatMessage',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            partyCode: party.code,
            userId: user.uid,
            displayName: user.email || 'Anonymous',
            platform: 'web',
            message: trimmedMessage
          })
        }
      );

      const data = await response.json();

      if (data.success) {
        setMessageInput('');
        // Immediately fetch new messages
        await fetchMessages();
      } else {
        alert(data.error || 'Failed to send message');
      }
    } catch (err) {
      console.error('Error sending message:', err);
      alert('Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Poll for new messages every 2 seconds when chat is open
  useEffect(() => {
    if (party && showChat) {
      // Fetch immediately
      fetchMessages();

      // Set up polling
      chatPollInterval.current = setInterval(fetchMessages, 2000);

      return () => {
        if (chatPollInterval.current) {
          clearInterval(chatPollInterval.current);
        }
      };
    }
  }, [party, showChat]);

  return (
    <>
      {/* Menu Modal */}
      {showMenu && (
        <div style={modalOverlayStyle} onClick={() => setShowMenu(false)}>
          <div style={menuContainerStyle} onClick={(e) => e.stopPropagation()}>
            <button
              style={menuButtonStyle}
              onClick={() => {
                setShowMenu(false);
                handleCreateParty();
              }}
            >
              🎬 Create Watch Party
            </button>

            <button
              style={menuButtonStyle}
              onClick={() => {
                setShowMenu(false);
                setShowJoinModal(true);
              }}
            >
              🔗 Join Watch Party
            </button>

            <button
              style={{ ...menuButtonStyle, ...menuButtonCancelStyle }}
              onClick={() => setShowMenu(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Join Party Modal */}
      {showJoinModal && (
        <div style={modalOverlayStyle}>
          <div style={modalStyle}>
            <div style={modalHeaderStyle}>
              <h2 style={{ margin: 0, color: tokens.textPrimary }}>Join Watch Party</h2>
              <button
                onClick={() => {
                  setShowJoinModal(false);
                  setJoinCode('');
                  setError(null);
                }}
                style={modalCloseButtonStyle}
              >
                ✕
              </button>
            </div>

            <p style={{ color: tokens.textSecondary, marginBottom: 20 }}>
              Enter the 6-character party code
            </p>

            <input
              type="text"
              style={codeInputStyle}
              placeholder="ABC123"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              maxLength={6}
              autoFocus
            />

            {error && <p style={errorTextStyle}>{error}</p>}

            <button
              style={{ ...primaryButtonStyle, opacity: loading ? 0.6 : 1 }}
              onClick={handleJoinParty}
              disabled={loading}
            >
              {loading ? 'Joining...' : 'Join Party'}
            </button>
          </div>
        </div>
      )}

      {/* Party Details Modal */}
      {showCreateModal && party && (
        <div style={modalOverlayStyle}>
          <div style={modalStyle}>
            <div style={modalHeaderStyle}>
              <h2 style={{ margin: 0, color: tokens.textPrimary }}>
                {isHost ? '🎬 Your Watch Party' : '👥 Watch Party'}
              </h2>
              <button onClick={() => setShowCreateModal(false)} style={modalCloseButtonStyle}>
                ✕
              </button>
            </div>

            <p style={{ color: tokens.accentCyan, fontWeight: 600, marginBottom: 20, textAlign: 'center' }}>
              {party.contentTitle}
            </p>

            {/* Join Notification Banner */}
            {joinNotification && isHost && (
              <div style={notificationBannerStyle}>
                <span style={{ fontSize: 20, marginRight: 8 }}>👋</span>
                {joinNotification}
              </div>
            )}

            {/* Join Code */}
            <div style={codeContainerStyle}>
              <p style={codeLabelStyle}>JOIN CODE</p>
              <p style={codeStyle}>{party.code}</p>
              {isHost && (
                <button style={shareButtonStyle} onClick={handleShareCode}>
                  📤 Share Code
                </button>
              )}
            </div>

            {/* Participants */}
            <div style={{ marginBottom: 20 }}>
              <p style={{ color: tokens.textPrimary, fontWeight: 600, marginBottom: 12 }}>
                Watching ({party.participants.length}/{party.maxParticipants})
              </p>
              <div style={participantsListStyle}>
                {party.participants.map((participant, index) => (
                  <div key={index} style={participantStyle}>
                    <span style={{ fontSize: 20, marginRight: 12 }}>
                      {participant.platform === 'mobile' ? '📱' :
                       participant.platform === 'web' ? '💻' : '📺'}
                    </span>
                    <span style={{ color: tokens.textSecondary, flex: 1 }}>
                      {participant.displayName}
                      {participant.userId === party.hostUserId && ' (Host)'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Status */}
            <div style={statusContainerStyle}>
              <span style={{ fontSize: 16, marginRight: 8 }}>
                {party.status === 'playing' ? '🟢' : party.status === 'waiting' ? '⏱️' : '⏸️'}
              </span>
              <span style={{ color: tokens.textPrimary, fontWeight: 600 }}>
                {party.status === 'playing' ? 'Playing' :
                 party.status === 'paused' ? 'Paused' :
                 isHost ? 'In Lobby' : 'Waiting for host to start...'}
              </span>
            </div>

            {/* Start Watch Party Button (Host Only, when status is 'waiting') */}
            {isHost && party.status === 'waiting' && (
              <button style={startButtonStyle} onClick={handleStartWatchParty}>
                ▶️ Start Watch Party
              </button>
            )}

            {/* Guest waiting message */}
            {!isHost && party.status === 'waiting' && (
              <p style={{ textAlign: 'center', color: tokens.textSecondary, marginBottom: 12, fontSize: 14 }}>
                The host will start the movie soon...
              </p>
            )}

            {/* Leave Button */}
            <button style={leaveButtonStyle} onClick={handleLeaveParty}>
              {isHost ? 'End Party' : 'Leave Party'}
            </button>
          </div>
        </div>
      )}

      {/* TikTok-Style Chat Overlay (Persistent, no toggle button) */}
      {party && showChat && typeof document !== 'undefined' && (
        overlayRoot === null ? (
          // Render inline when overlayRoot is null (fullscreen video mode)
          <>
            <div style={chatMessageStackStyle}>
              {messages.length === 0 ? (
                <p style={chatEmptyTextStyle}>No messages yet. Say hi! 👋</p>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    style={{
                      ...chatMessageRowStyle,
                      justifyContent: msg.userId === user.uid ? 'flex-end' : 'flex-start'
                    }}
                  >
                    <span style={chatHandleStyle}>{msg.displayName}</span>
                    <span
                      style={{
                        ...chatMessageChipStyle,
                        backgroundColor: msg.userId === user.uid
                          ? 'rgba(255, 20, 147, 0.5)'
                          : 'rgba(0, 0, 0, 0.55)'
                      }}
                    >
                      {msg.message}
                    </span>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
            <div style={chatInputDockStyle}>
              <input
                type="text"
                style={chatInputStyle}
                placeholder="Send a message"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyPress={handleKeyPress}
                maxLength={200}
              />
              <button
                style={{
                  ...chatSendButtonStyle,
                  opacity: sendingMessage || !messageInput.trim() ? 0.5 : 1
                }}
                onClick={sendMessage}
                disabled={sendingMessage || !messageInput.trim()}
              >
                ➤
              </button>
            </div>
          </>
        ) : overlayRoot ? (
          // Use portal when overlayRoot is provided (feed view mode)
          createPortal(
            <>
              <div style={chatMessageStackStyle}>
                {messages.length === 0 ? (
                  <p style={chatEmptyTextStyle}>No messages yet. Say hi! 👋</p>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      style={{
                        ...chatMessageRowStyle,
                        justifyContent: msg.userId === user.uid ? 'flex-end' : 'flex-start'
                      }}
                    >
                      <span style={chatHandleStyle}>{msg.displayName}</span>
                      <span
                        style={{
                          ...chatMessageChipStyle,
                          backgroundColor: msg.userId === user.uid
                            ? 'rgba(255, 20, 147, 0.5)'
                            : 'rgba(0, 0, 0, 0.55)'
                        }}
                      >
                        {msg.message}
                      </span>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
              <div style={chatInputDockStyle}>
                <input
                  type="text"
                  style={chatInputStyle}
                  placeholder="Send a message"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  maxLength={200}
                />
                <button
                  style={{
                    ...chatSendButtonStyle,
                    opacity: sendingMessage || !messageInput.trim() ? 0.5 : 1
                  }}
                  onClick={sendMessage}
                  disabled={sendingMessage || !messageInput.trim()}
                >
                  ➤
                </button>
              </div>
            </>,
            overlayRoot
          )
        ) : null
      )}
    </>
  );
}

// Styles
const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.8)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 10000
};

const menuContainerStyle: React.CSSProperties = {
  backgroundColor: tokens.backgroundSecondary,
  borderRadius: 16,
  overflow: 'hidden',
  minWidth: 320
};

const menuButtonStyle: React.CSSProperties = {
  width: '100%',
  padding: 20,
  border: 'none',
  borderBottom: `1px solid ${tokens.borderDefault}`,
  backgroundColor: 'transparent',
  color: tokens.textPrimary,
  fontSize: 18,
  fontWeight: 600,
  cursor: 'pointer',
  textAlign: 'center',
  transition: 'background-color 0.2s ease'
};

const menuButtonCancelStyle: React.CSSProperties = {
  borderBottom: 'none',
  color: tokens.textMuted
};

const modalStyle: React.CSSProperties = {
  backgroundColor: tokens.backgroundSecondary,
  borderRadius: 24,
  padding: 32,
  width: '100%',
  maxWidth: 480,
  margin: 20
};

const modalHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 20
};

const modalCloseButtonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: tokens.textSecondary,
  fontSize: 32,
  cursor: 'pointer',
  padding: 0,
  lineHeight: 1
};

const codeInputStyle: React.CSSProperties = {
  width: '100%',
  backgroundColor: tokens.backgroundPrimary,
  color: tokens.textPrimary,
  fontSize: 24,
  fontWeight: 700,
  textAlign: 'center',
  letterSpacing: 4,
  padding: 20,
  borderRadius: 12,
  marginBottom: 20,
  border: `1px solid ${tokens.borderDefault}`,
  fontFamily: 'inherit'
};

const codeContainerStyle: React.CSSProperties = {
  backgroundColor: tokens.backgroundPrimary,
  borderRadius: 12,
  padding: 20,
  marginBottom: 20,
  textAlign: 'center'
};

const codeLabelStyle: React.CSSProperties = {
  color: tokens.textMuted,
  fontSize: 12,
  fontWeight: 600,
  marginBottom: 8,
  textTransform: 'uppercase'
};

const codeStyle: React.CSSProperties = {
  color: tokens.textPrimary,
  fontSize: 36,
  fontWeight: 700,
  letterSpacing: 6,
  marginBottom: 12
};

const shareButtonStyle: React.CSSProperties = {
  backgroundColor: tokens.accentMagenta,
  border: 'none',
  padding: '10px 24px',
  borderRadius: 20,
  color: tokens.textPrimary,
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  marginTop: 8
};

const participantsListStyle: React.CSSProperties = {
  maxHeight: 150,
  overflowY: 'auto'
};

const participantStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  paddingTop: 8,
  paddingBottom: 8,
  borderBottom: `1px solid ${tokens.borderDefault}`
};

const statusContainerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 12,
  backgroundColor: tokens.backgroundPrimary,
  borderRadius: 12,
  marginBottom: 20
};

const primaryButtonStyle: React.CSSProperties = {
  width: '100%',
  backgroundColor: tokens.accentMagenta,
  border: 'none',
  padding: 16,
  borderRadius: 24,
  color: tokens.textPrimary,
  fontSize: 16,
  fontWeight: 700,
  cursor: 'pointer'
};

const startButtonStyle: React.CSSProperties = {
  width: '100%',
  backgroundColor: tokens.accentCyan,
  border: 'none',
  padding: 16,
  borderRadius: 24,
  color: tokens.textPrimary,
  fontSize: 18,
  fontWeight: 700,
  cursor: 'pointer',
  marginBottom: 12
};

const leaveButtonStyle: React.CSSProperties = {
  width: '100%',
  backgroundColor: tokens.error,
  border: 'none',
  padding: 16,
  borderRadius: 24,
  color: tokens.textPrimary,
  fontSize: 16,
  fontWeight: 700,
  cursor: 'pointer'
};

const errorTextStyle: React.CSSProperties = {
  color: tokens.error,
  fontSize: 14,
  textAlign: 'center',
  marginBottom: 16
};

const notificationBannerStyle: React.CSSProperties = {
  backgroundColor: tokens.accentCyan,
  color: tokens.textPrimary,
  padding: '12px 20px',
  borderRadius: 12,
  marginBottom: 20,
  textAlign: 'center',
  fontWeight: 600,
  fontSize: 16,
  animation: 'slideIn 0.3s ease-out'
};

// Chat Styles (TikTok-inspired) - Persistent overlay without toggle
const chatMessageStackStyle: React.CSSProperties = {
  position: 'absolute', // Changed from fixed to absolute for video overlay
  top: '18vh',
  right: 24,
  width: 'min(300px, 32vw)',
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  maxHeight: '56vh',
  overflowY: 'auto',
  scrollbarWidth: 'none',
  pointerEvents: 'none',
  color: tokens.textPrimary,
  textShadow: '0 2px 8px rgba(0,0,0,0.65)',
  fontSize: 14,
  lineHeight: 1.35,
  zIndex: 10001, // Above video but below modals
  padding: '4px 8px',
  borderRadius: 18,
  background: 'linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.05) 100%)'
};

const chatMessageRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  pointerEvents: 'none'
};

const chatHandleStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: tokens.accentCyan,
  textTransform: 'lowercase',
  opacity: 0.85
};

const chatMessageChipStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '6px 12px',
  borderRadius: 16,
  backdropFilter: 'blur(8px)',
  border: '1px solid rgba(255,255,255,0.18)',
  pointerEvents: 'none'
};

const chatEmptyTextStyle: React.CSSProperties = {
  color: tokens.textMuted,
  textAlign: 'right',
  fontSize: 13,
  pointerEvents: 'none'
};

const chatInputDockStyle: React.CSSProperties = {
  position: 'absolute', // Changed from fixed to absolute for video overlay
  bottom: '16vh',
  right: 24,
  width: 'min(300px, 32vw)',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  pointerEvents: 'auto',
  backgroundColor: 'rgba(0,0,0,0.55)',
  borderRadius: 999,
  padding: '8px 12px',
  border: '1px solid rgba(255,255,255,0.15)',
  backdropFilter: 'blur(14px)',
  zIndex: 10001 // Above video but below modals
};

const chatInputStyle: React.CSSProperties = {
  flex: 1,
  background: 'transparent',
  border: 'none',
  padding: 0,
  color: tokens.textPrimary,
  fontSize: 14,
  outline: 'none'
};

const chatSendButtonStyle: React.CSSProperties = {
  backgroundColor: 'rgba(255, 20, 147, 0.85)',
  border: 'none',
  color: tokens.textPrimary,
  borderRadius: 12,
  width: 36,
  height: 36,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 16,
  cursor: 'pointer'
};

