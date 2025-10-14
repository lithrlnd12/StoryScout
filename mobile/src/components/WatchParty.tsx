import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Share as RNShare,
  ScrollView,
  Alert
} from 'react-native';
import type { Video } from 'expo-av';
import tokens from '../../../shared/tokens/colors.json';
import {
  createWatchParty,
  joinWatchParty,
  updateWatchPartyState,
  leaveWatchParty,
  subscribeToWatchParty,
  type WatchParty,
  type TrailerDoc
} from '../../../shared/firebase/firestore';
import type { User } from '../../../shared/firebase/auth';

type WatchPartyProps = {
  user: User;
  currentContent: TrailerDoc | null;
  videoRef: React.MutableRefObject<Video | null>;
  showMenu?: boolean;
  onMenuClose?: () => void;
  onPartyStateChange?: (inParty: boolean) => void;
  onWatchFullMovie?: (videoUrl: string) => void;
};

export default function WatchPartyComponent({
  user,
  currentContent,
  videoRef,
  showMenu: externalShowMenu,
  onMenuClose,
  onPartyStateChange,
  onWatchFullMovie
}: WatchPartyProps) {
  console.log('[WatchParty] Component rendered');
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

  // Use refs to track state for subscription callback (avoid stale closures)
  const showCreateModalRef = useRef(showCreateModal);
  const onWatchFullMovieRef = useRef(onWatchFullMovie);

  useEffect(() => {
    showCreateModalRef.current = showCreateModal;
  }, [showCreateModal]);

  useEffect(() => {
    onWatchFullMovieRef.current = onWatchFullMovie;
  }, [onWatchFullMovie]);

  // Use external showMenu if provided, otherwise use internal state
  const showMenu = externalShowMenu !== undefined ? externalShowMenu : internalShowMenu;
  const setShowMenu = onMenuClose
    ? (value: boolean) => { if (!value) onMenuClose(); }
    : setInternalShowMenu;

  // Subscribe to party updates
  useEffect(() => {
    if (!party) {
      console.log('[WatchParty] No party to subscribe to');
      return;
    }

    console.log('[WatchParty] Subscribing to party:', party.id, 'Current status:', party.status);

    const unsubscribe = subscribeToWatchParty(party.id, (updatedParty) => {
      if (!updatedParty) {
        // Party ended
        console.log('[WatchParty] Party ended - no data received');
        setParty(null);
        setIsHost(false);
        onPartyStateChange?.(false);
        return;
      }

      console.log('[WatchParty] Party updated! Status:', updatedParty.status, 'isHost:', isHost, 'showCreateModal:', showCreateModal);

      // Notify host when someone joins
      if (isHost && updatedParty.participants.length > previousParticipantCount) {
        const newParticipant = updatedParty.participants[updatedParty.participants.length - 1];
        setShowCreateModal(true);
        setJoinNotification(`${newParticipant.displayName} joined!`);
        setTimeout(() => setJoinNotification(null), 3000);
      }
      setPreviousParticipantCount(updatedParty.participants.length);

      setParty(updatedParty);
      syncVideoWithParty(updatedParty);
    });

    return unsubscribe;
  }, [party?.id, isHost, previousParticipantCount]);

  // Sync video playback with party state
  const syncVideoWithParty = async (partyState: WatchParty) => {
    const modalIsShowing = showCreateModalRef.current;
    const callback = onWatchFullMovieRef.current;
    console.log('[WatchParty] syncVideoWithParty called - status:', partyState.status, 'modalIsShowing:', modalIsShowing, 'videoUrl:', partyState.videoUrl);

    // CRITICAL: Only navigate to full movie if status is 'playing' AND modal is currently showing
    // This prevents automatic navigation when guest first joins (they should see lobby first)
    if (partyState.status === 'playing' && partyState.videoUrl && callback && modalIsShowing) {
      console.log('[WatchParty] ALL conditions met! Calling onWatchFullMovie with:', partyState.videoUrl);
      setShowCreateModal(false);
      callback(partyState.videoUrl);
      return;
    }

    console.log('[WatchParty] Navigation conditions not met:', {
      isPlaying: partyState.status === 'playing',
      hasVideoUrl: !!partyState.videoUrl,
      hasCallback: !!callback,
      modalIsShowing: modalIsShowing
    });

    // If in lobby (waiting), pause the video for guests and ensure modal is visible
    if (partyState.status === 'waiting' && !isHost && videoRef.current) {
      try {
        const status = await videoRef.current.getStatusAsync();
        if (status.isLoaded && status.isPlaying) {
          await videoRef.current.pauseAsync();
        }
      } catch (err) {
        console.error('Error pausing video:', err);
      }
      // Ensure lobby modal is visible for guests waiting
      if (!showCreateModal) {
        setShowCreateModal(true);
      }
      return;
    }

    // For ongoing playback sync (participants only)
    if (isHost || !videoRef.current) return;

    try {
      const status = await videoRef.current.getStatusAsync();
      if (!status.isLoaded) return;

      // Sync play/pause
      if (partyState.status === 'playing' && !status.isPlaying) {
        await videoRef.current.playAsync();
      } else if (partyState.status === 'paused' && status.isPlaying) {
        await videoRef.current.pauseAsync();
      }

      // Sync timestamp (allow 3-second drift)
      const currentTime = (status.positionMillis || 0) / 1000;
      const drift = Math.abs(currentTime - partyState.currentTime);

      if (drift > 3 && partyState.status === 'playing') {
        await videoRef.current.setPositionAsync(partyState.currentTime * 1000);
      }
    } catch (err) {
      console.error('Error syncing video:', err);
    }
  };

  // Host: Update party state every 5 seconds (ONLY when party is already playing)
  useEffect(() => {
    if (!party || !isHost || !videoRef.current) return;

    // Don't update if still in lobby (status is 'waiting')
    if (party.status === 'waiting') return;

    const interval = setInterval(async () => {
      try {
        const status = await videoRef.current?.getStatusAsync();
        if (!status || !status.isLoaded) return;

        const currentTime = (status.positionMillis || 0) / 1000;
        const playbackStatus = status.isPlaying ? 'playing' : 'paused';

        await updateWatchPartyState(party.id, playbackStatus as any, currentTime);
      } catch (err) {
        console.error('Error updating party state:', err);
      }
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [party, isHost]);

  const handleCreateParty = async () => {
    if (!currentContent) {
      Alert.alert('Error', 'No video is currently playing');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const newParty = await createWatchParty(
        user.uid,
        user.email || 'Anonymous',
        'mobile',
        currentContent
      );

      setParty(newParty);
      setIsHost(true);
      setPreviousParticipantCount(1); // Initialize with host count
      setShowCreateModal(true);
      setShowMenu(false);
      onPartyStateChange?.(true);
    } catch (err: any) {
      setError(err.message || 'Failed to create party');
      Alert.alert('Error', err.message || 'Failed to create party');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinParty = async () => {
    if (!joinCode.trim()) {
      Alert.alert('Error', 'Please enter a party code');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const joinedParty = await joinWatchParty(
        joinCode.trim().toUpperCase(),
        user.uid,
        user.email || 'Anonymous',
        'mobile'
      );

      setParty(joinedParty);
      setIsHost(false);
      setPreviousParticipantCount(joinedParty.participants.length);
      setShowJoinModal(false);
      setShowMenu(false);
      setJoinCode('');
      setShowCreateModal(true); // Show lobby for guests
      onPartyStateChange?.(true);

      // Don't auto-start - guest stays in lobby modal and sees "Waiting for host..."
    } catch (err: any) {
      setError(err.message || 'Failed to join party');
      Alert.alert('Error', err.message || 'Failed to join party');
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveParty = async () => {
    if (!party) return;

    Alert.alert(
      'Leave Party',
      isHost ? 'Are you sure? This will end the party for everyone.' : 'Are you sure you want to leave?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              await leaveWatchParty(party.id, user.uid);
              setParty(null);
              setIsHost(false);
              setShowCreateModal(false);
              onPartyStateChange?.(false);
            } catch (err) {
              console.error('Error leaving party:', err);
            }
          }
        }
      ]
    );
  };

  const handleShareCode = async () => {
    if (!party) return;

    try {
      await RNShare.share({
        message: `Join my Story Scout watch party!\n\nCode: ${party.code}\nWatching: ${party.contentTitle}\n\nEnter this code in the app to watch together!`,
        title: 'Watch Party Invitation'
      });
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
      Alert.alert('Error', 'Failed to start watch party');
    }
  };

  return (
    <>
      {/* Menu Modal */}
      <Modal visible={showMenu} transparent animationType="fade">
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setShowMenu(false)}
        >
          <View style={styles.menuContainer}>
            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => {
                setShowMenu(false);
                handleCreateParty();
              }}
            >
              <Text style={styles.menuButtonText}>🎬 Create Watch Party</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => {
                setShowMenu(false);
                setShowJoinModal(true);
              }}
            >
              <Text style={styles.menuButtonText}>🔗 Join Watch Party</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuButton, styles.menuButtonCancel]}
              onPress={() => setShowMenu(false)}
            >
              <Text style={styles.menuButtonCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Join Party Modal */}
      <Modal visible={showJoinModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Join Watch Party</Text>
              <TouchableOpacity onPress={() => {
                setShowJoinModal(false);
                setJoinCode('');
                setError(null);
              }}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>Enter the 6-character party code</Text>

            <TextInput
              style={styles.codeInput}
              placeholder="ABC123"
              placeholderTextColor={tokens.textMuted}
              value={joinCode}
              onChangeText={(text) => setJoinCode(text.toUpperCase())}
              maxLength={6}
              autoCapitalize="characters"
              autoCorrect={false}
            />

            {error && <Text style={styles.errorText}>{error}</Text>}

            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.buttonDisabled]}
              onPress={handleJoinParty}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={tokens.textPrimary} />
              ) : (
                <Text style={styles.primaryButtonText}>Join Party</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Party Details Modal */}
      <Modal visible={showCreateModal && !!party} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isHost ? '🎬 Your Watch Party' : '👥 Watch Party'}
              </Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {party && (
              <>
                <Text style={styles.contentTitle}>{party.contentTitle}</Text>

                {/* Join Notification Banner */}
                {joinNotification && isHost && (
                  <View style={styles.notificationBanner}>
                    <Text style={styles.notificationText}>👋 {joinNotification}</Text>
                  </View>
                )}

                {/* Join Code */}
                <View style={styles.codeContainer}>
                  <Text style={styles.codeLabel}>Join Code</Text>
                  <Text style={styles.code}>{party.code}</Text>
                  {isHost && (
                    <TouchableOpacity
                      style={styles.shareButton}
                      onPress={handleShareCode}
                    >
                      <Text style={styles.shareButtonText}>📤 Share Code</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Participants */}
                <View style={styles.participantsContainer}>
                  <Text style={styles.participantsTitle}>
                    Watching ({party.participants.length}/{party.maxParticipants})
                  </Text>
                  <ScrollView style={styles.participantsList}>
                    {party.participants.map((participant, index) => (
                      <View key={index} style={styles.participant}>
                        <Text style={styles.participantIcon}>
                          {participant.platform === 'mobile' ? '📱' :
                           participant.platform === 'web' ? '💻' : '📺'}
                        </Text>
                        <Text style={styles.participantName}>
                          {participant.displayName}
                          {participant.userId === party.hostUserId && ' (Host)'}
                        </Text>
                      </View>
                    ))}
                  </ScrollView>
                </View>

                {/* Status */}
                <View style={styles.statusContainer}>
                  <Text style={styles.statusDot}>
                    {party.status === 'playing' ? '🟢' : party.status === 'waiting' ? '⏱️' : '⏸️'}
                  </Text>
                  <Text style={styles.statusText}>
                    {party.status === 'playing' ? 'Playing' :
                     party.status === 'paused' ? 'Paused' :
                     isHost ? 'In Lobby' : 'Waiting for host to start...'}
                  </Text>
                </View>

                {/* Start Watch Party Button (Host Only, when status is 'waiting') */}
                {isHost && party.status === 'waiting' && (
                  <TouchableOpacity style={styles.startButton} onPress={handleStartWatchParty}>
                    <Text style={styles.startButtonText}>▶️ Start Watch Party</Text>
                  </TouchableOpacity>
                )}

                {/* Guest waiting message */}
                {!isHost && party.status === 'waiting' && (
                  <Text style={styles.waitingMessage}>
                    The host will start the movie soon...
                  </Text>
                )}

                {/* Leave Button */}
                <TouchableOpacity
                  style={[styles.primaryButton, styles.leaveButton]}
                  onPress={handleLeaveParty}
                >
                  <Text style={styles.leaveButtonText}>
                    {isHost ? 'End Party' : 'Leave Party'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  floatingButton: {
    position: 'absolute',
    bottom: 150,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: tokens.accentMagenta,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 100
  },
  floatingIndicator: {
    position: 'absolute',
    bottom: 150,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: tokens.accentCyan,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 100
  },
  floatingIcon: {
    fontSize: 28
  },
  floatingCount: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: tokens.error,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    color: tokens.textPrimary,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 24
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
    padding: 16
  },
  menuContainer: {
    backgroundColor: tokens.backgroundSecondary,
    borderRadius: 16,
    overflow: 'hidden'
  },
  menuButton: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: tokens.borderDefault
  },
  menuButtonText: {
    color: tokens.textPrimary,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center'
  },
  menuButtonCancel: {
    borderBottomWidth: 0
  },
  menuButtonCancelText: {
    color: tokens.textMuted,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end'
  },
  modal: {
    backgroundColor: tokens.backgroundSecondary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  modalTitle: {
    color: tokens.textPrimary,
    fontSize: 22,
    fontWeight: '700'
  },
  modalClose: {
    color: tokens.textSecondary,
    fontSize: 32,
    fontWeight: '300'
  },
  modalSubtitle: {
    color: tokens.textSecondary,
    fontSize: 14,
    marginBottom: 20
  },
  contentTitle: {
    color: tokens.accentCyan,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center'
  },
  codeInput: {
    backgroundColor: tokens.backgroundPrimary,
    color: tokens.textPrimary,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 4,
    padding: 20,
    borderRadius: 12,
    marginBottom: 20
  },
  codeContainer: {
    backgroundColor: tokens.backgroundPrimary,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center'
  },
  codeLabel: {
    color: tokens.textMuted,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase'
  },
  code: {
    color: tokens.textPrimary,
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: 6,
    marginBottom: 12
  },
  shareButton: {
    backgroundColor: tokens.accentMagenta,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 20,
    marginTop: 8
  },
  shareButtonText: {
    color: tokens.textPrimary,
    fontSize: 14,
    fontWeight: '600'
  },
  participantsContainer: {
    marginBottom: 20
  },
  participantsTitle: {
    color: tokens.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12
  },
  participantsList: {
    maxHeight: 150
  },
  participant: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: tokens.borderDefault
  },
  participantIcon: {
    fontSize: 20,
    marginRight: 12
  },
  participantName: {
    color: tokens.textSecondary,
    fontSize: 14,
    flex: 1
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: tokens.backgroundPrimary,
    borderRadius: 12,
    marginBottom: 20
  },
  statusDot: {
    fontSize: 16,
    marginRight: 8
  },
  statusText: {
    color: tokens.textPrimary,
    fontSize: 14,
    fontWeight: '600'
  },
  primaryButton: {
    backgroundColor: tokens.accentMagenta,
    padding: 16,
    borderRadius: 24,
    alignItems: 'center'
  },
  primaryButtonText: {
    color: tokens.textPrimary,
    fontSize: 16,
    fontWeight: '700'
  },
  buttonDisabled: {
    opacity: 0.6
  },
  leaveButton: {
    backgroundColor: tokens.error
  },
  leaveButtonText: {
    color: tokens.textPrimary,
    fontSize: 16,
    fontWeight: '700'
  },
  errorText: {
    color: tokens.error,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16
  },
  notificationBanner: {
    backgroundColor: tokens.accentCyan,
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: 'center'
  },
  notificationText: {
    color: tokens.textPrimary,
    fontSize: 16,
    fontWeight: '600'
  },
  startButton: {
    backgroundColor: tokens.accentCyan,
    padding: 16,
    borderRadius: 24,
    alignItems: 'center',
    marginBottom: 12
  },
  startButtonText: {
    color: tokens.textPrimary,
    fontSize: 18,
    fontWeight: '700'
  },
  waitingMessage: {
    textAlign: 'center',
    color: tokens.textSecondary,
    marginBottom: 12,
    fontSize: 14
  }
});
