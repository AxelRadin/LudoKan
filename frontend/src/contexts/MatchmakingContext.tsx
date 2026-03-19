import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiGet, apiPatch, apiPost } from '../services/api';
import FloatingMatchmakingWidget from '../components/FloatingMatchmakingWidget';
import MatchmakingModal from '../components/MatchmakingModal';
import { useAuth } from './useAuth';

interface MatchmakingContextType {
    startMatchmaking: (gameId: string) => Promise<void>;
    isMatching: boolean;
}

const MatchmakingContext = createContext<MatchmakingContextType | undefined>(undefined);

export function useMatchmaking() {
    const context = useContext(MatchmakingContext);
    if (!context) {
        throw new Error('useMatchmaking must be used within a MatchmakingProvider');
    }
    return context;
}

export function MatchmakingProvider({ children }: { children: React.ReactNode }) {
    const { isAuthenticated } = useAuth();

    const [isMatching, setIsMatching] = useState(false);
    const [isMatchmakingModalOpen, setIsMatchmakingModalOpen] = useState(false);
    const [matches, setMatches] = useState<any[]>([]);

    const [activeRequestId, setActiveRequestId] = useState<number | null>(null);
    const [activeRequestStartedAt, setActiveRequestStartedAt] = useState<Date | null>(null);
    const [currentRadius, setCurrentRadius] = useState<number>(20);
    const [hasNewMatch, setHasNewMatch] = useState(false);

    async function getUserLocation(): Promise<{ latitude: number; longitude: number }> {
        return new Promise((resolve) => {
            const fallbackToIP = async () => {
                try {
                    const res = await fetch('https://get.geojs.io/v1/ip/geo.json');
                    const data = await res.json();
                    resolve({ latitude: parseFloat(data.latitude), longitude: parseFloat(data.longitude) });
                } catch {
                    resolve({ latitude: 48.8566, longitude: 2.3522 });
                }
            };

            if (!navigator.geolocation) {
                fallbackToIP();
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
                () => fallbackToIP()
            );
        });
    }

    useEffect(() => {
        if (isAuthenticated) {
            apiGet('/api/matchmaking/requests/').then(async (reqs) => {
                if (reqs && reqs.length > 0) {
                    const active = reqs[0];
                    setActiveRequestId(active.id);
                    setActiveRequestStartedAt(new Date(active.created_at));
                    setCurrentRadius(active.radius_km);

                    try {
                        const currentMatches = await apiGet('/api/matchmaking/matches/');
                        setMatches(currentMatches);
                    } catch (e) {
                        console.error(e);
                    }
                }
            }).catch(() => { });
        } else {
            setActiveRequestId(null);
            setActiveRequestStartedAt(null);
            setMatches([]);
        }
    }, [isAuthenticated]);

    const startMatchmaking = async (gameId: string) => {
        setIsMatching(true);
        try {
            const { latitude, longitude } = await getUserLocation();
            const defaultExpiresAt = new Date();
            defaultExpiresAt.setHours(defaultExpiresAt.getHours() + 1);

            let reqId = null;
            let startedDate = new Date();
            let radius = 20;

            try {
                const res = await apiPost('/api/matchmaking/requests/', {
                    game: gameId,
                    latitude,
                    longitude,
                    radius_km: radius,
                    expires_at: defaultExpiresAt.toISOString(),
                });
                reqId = res.id;
                startedDate = new Date(res.created_at);
            } catch {
                const activeReqs = await apiGet(`/api/matchmaking/requests/?game=${gameId}`);
                if (activeReqs && activeReqs.length > 0) {
                    reqId = activeReqs[0].id;
                    radius = activeReqs[0].radius_km;
                    startedDate = new Date(activeReqs[0].created_at);
                }
            }

            setActiveRequestId(reqId);
            setCurrentRadius(radius);
            setActiveRequestStartedAt(startedDate);

            const matchesData = await apiGet('/api/matchmaking/matches/');
            setMatches(matchesData);
            setHasNewMatch(false);
            setIsMatchmakingModalOpen(true);
        } catch (error) {
            console.error("Erreur API lors du matchmaking", error);
            alert("Un problème est survenu lors de la recherche de joueurs.");
        } finally {
            setIsMatching(false);
        }
    };

    useEffect(() => {
        if (!activeRequestId) return;

        const intervalId = setInterval(async () => {
            try {
                const currentMatches = await apiGet('/api/matchmaking/matches/');
                if (currentMatches.length > matches.length) {
                    setMatches(currentMatches);
                    setHasNewMatch(true);
                }
            } catch {
                setActiveRequestId(null);
                setActiveRequestStartedAt(null);
            }
        }, 10000);

        return () => clearInterval(intervalId);
    }, [activeRequestId, matches.length]);

    useEffect(() => {
        if (!activeRequestId || hasNewMatch) return;

        const timeoutId = setTimeout(async () => {
            const newRadius = currentRadius * 2;
            try {
                await apiPatch(`/api/matchmaking/requests/${activeRequestId}/`, {
                    radius_km: newRadius,
                });
                setCurrentRadius(newRadius);
            } catch (error) {
                console.error("Erreur d'extension du rayon", error);
            }
        }, 5 * 60 * 1000);

        return () => clearTimeout(timeoutId);
    }, [activeRequestId, currentRadius, hasNewMatch]);

    return (
        <MatchmakingContext.Provider value={{ startMatchmaking, isMatching }}>
            {children}

            {activeRequestStartedAt && !isMatchmakingModalOpen && isAuthenticated && (
                <FloatingMatchmakingWidget
                    startedAt={activeRequestStartedAt}
                    hasNewMatch={hasNewMatch}
                    onClick={() => {
                        setIsMatchmakingModalOpen(true);
                        setHasNewMatch(false);
                    }}
                />
            )}

            <MatchmakingModal
                open={isMatchmakingModalOpen}
                onClose={() => setIsMatchmakingModalOpen(false)}
                matches={matches}
                startedAt={activeRequestStartedAt}
            />
        </MatchmakingContext.Provider>
    );
}