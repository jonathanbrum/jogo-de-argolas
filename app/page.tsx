'use client'
import { useRef, useEffect, useState } from 'react';

// Constantes de configuração do jogo
const RINGS_PER_PEG = 4;
const RING_HEIGHT_PX = 40; // Altura de cada anel em pixels para cálculo
const RING_OVERLAP_PX = 10; // Sobreposição entre os anéis

const LEVELS = [
    { // Nível 1
        pegCount: 4,
        initialState: [ [1, 2, 1, 2], [3, 1, 3, 3], [2, 3, 1, 2], [] ]
    },
    { // Nível 2
        pegCount: 5,
        initialState: [ [1, 2, 3, 4], [1, 2, 3, 4], [1, 2, 3, 4], [1, 2, 3, 4], [] ]
    },
    { // Nível 3
        pegCount: 6,
        initialState: [ [1,2,3,4],[5,1,2,3],[4,5,1,2],[3,4,5,1],[2,3,4,5],[] ]
    }
];

// Mapeamento de cores para classes Tailwind
const COLOR_MAP: {[key: number]: string} = {
    1: 'bg-[#ff6b6b]', // Vermelho
    2: 'bg-[#4ecdc4]', // Turquesa
    3: 'bg-[#45b7d1]', // Azul
    4: 'bg-[#f7d154]', // Amarelo
    5: 'bg-[#b29dd9]', // Roxo
    6: 'bg-[#f0932b]', // Laranja
};

type StatusType = 'sliding' | 'landing';

// Componente do Jogo
export default function Page() {
    const [currentLevel, setCurrentLevel] = useState(0);
    const [gameState, setGameState] = useState<number[][]>([]);
    const [selectedRingsInfo, setSelectedRingsInfo] = useState<{index: number, rings: number[]} | null>(null);
    const [moves, setMoves] = useState(0);
    const [isWin, setIsWin] = useState(false);
    const [numColors, setNumColors] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);
    const [animationInfo, setAnimationInfo] = useState<{ sourceIndex: number, targetIndex: number, rings: number[], status: StatusType } | null>(null);

    const pegRefs = useRef<(HTMLDivElement | null)[]>([]);
    const [pegPositions, setPegPositions] = useState<number[]>([]);

    const pegVisualHeight = (RINGS_PER_PEG * RING_HEIGHT_PX) - ((RINGS_PER_PEG - 1) * RING_OVERLAP_PX) + 10;

    const initGame = (levelIndex: number) => {
        const levelData = LEVELS[levelIndex];
        const initialPegs = JSON.parse(JSON.stringify(levelData.initialState));
        
        const uniqueColors = new Set(initialPegs.flat());
        setNumColors(uniqueColors.size);

        while (initialPegs.length < levelData.pegCount) {
            initialPegs.push([]);
        }

        setGameState(initialPegs);
        setCurrentLevel(levelIndex);
        setSelectedRingsInfo(null);
        setMoves(0);
        setIsWin(false);
        setIsAnimating(false);
        setAnimationInfo(null);
    };

    useEffect(() => {
        initGame(0);
    }, []);
    
    useEffect(() => {
        const calculatePositions = () => {
            const positions = pegRefs.current.map(el => {
                if (el) {
                    const rect = el.getBoundingClientRect();
                    return rect.left + rect.width / 2;
                }
                return 0;
            });
            setPegPositions(positions);
        };

        calculatePositions();
        window.addEventListener('resize', calculatePositions);
        return () => window.removeEventListener('resize', calculatePositions);
    }, [gameState.length]);

    useEffect(() => {
        if (!isAnimating) {
             checkWinCondition(gameState);
        }
    }, [gameState, isAnimating]);


    const checkWinCondition = (currentState: number[][]) => {
        if(!currentState || currentState.length === 0) return;
        const totalColors = numColors;
        if (totalColors === 0) return;

        for (const peg of currentState) {
            if (peg.length > 0) {
                if (peg.length !== RINGS_PER_PEG) return; 
                const firstColor = peg[0];
                if (!peg.every(color => color === firstColor)) return;
            }
        }

        const sortedPegsCount = currentState.filter(peg => peg.length > 0).length;
        if (sortedPegsCount === totalColors) setIsWin(true);
    };

    const handlePegClick = (clickedPegIndex: number) => {
        if (isWin || isAnimating) return;

        if (selectedRingsInfo === null) {
            const sourcePeg = gameState[clickedPegIndex];
            if (sourcePeg.length > 0) {
                const topRingColor = sourcePeg[sourcePeg.length - 1];
                let ringsToMove = [];
                for (let i = sourcePeg.length - 1; i >= 0; i--) {
                    if (sourcePeg[i] === topRingColor) ringsToMove.unshift(sourcePeg[i]);
                    else break;
                }
                setSelectedRingsInfo({ index: clickedPegIndex, rings: ringsToMove });
            }
        } else {
            const { index: sourcePegIndex, rings: ringsToMove } = selectedRingsInfo;
            
            if (sourcePegIndex === clickedPegIndex) {
                setSelectedRingsInfo(null);
                return;
            }

            const targetPeg = gameState[clickedPegIndex];
            const ringColor = ringsToMove[0];

            const canMove = 
                targetPeg.length + ringsToMove.length <= RINGS_PER_PEG &&
                (targetPeg.length === 0 || targetPeg[targetPeg.length - 1] === ringColor);

            if (canMove) {
                setIsAnimating(true);
                setAnimationInfo({ sourceIndex: sourcePegIndex, targetIndex: clickedPegIndex, rings: ringsToMove, status: 'sliding' });
                setSelectedRingsInfo(null);
                setMoves(prev => prev + 1);

                setTimeout(() => {
                    setGameState(prevGameState => {
                        const newGameState = JSON.parse(JSON.stringify(prevGameState));
                        const source = newGameState[sourcePegIndex];
                        const target = newGameState[clickedPegIndex];
                        source.splice(source.length - ringsToMove.length, ringsToMove.length);
                        target.push(...ringsToMove);
                        return newGameState;
                    });

                    setAnimationInfo(prev => prev ? ({ ...prev, status: 'landing' }) : null);

                    setTimeout(() => {
                        setIsAnimating(false);
                        setAnimationInfo(null);
                    }, 300); // Duração da animação de aterrissagem

                }, 400); // Duração da animação de deslize
            } else {
                setSelectedRingsInfo(null);
            }
        }
    };
    
    const handleNextLevel = () => {
        const nextLevelIndex = (currentLevel + 1) % LEVELS.length;
        initGame(nextLevelIndex);
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-[#1e1a3e] to-[#3d357a] text-gray-100 font-sans flex justify-center items-center p-4">
            <div className="flex flex-col items-center p-5 w-full max-w-4xl">
                <header className="w-full flex justify-between items-center px-2 mb-8">
                    <h1 className="text-3xl md:text-4xl font-bold text-white tracking-wider drop-shadow-md">
                        NÍVEL <span>{currentLevel + 1}</span>
                    </h1>
                    <div className="text-lg text-gray-200">
                        MOVIMENTOS: <span>{moves}</span>
                    </div>
                </header>

                <main className="flex justify-center items-center flex-wrap gap-x-2 gap-y-8 md:gap-x-5 p-5 w-full">
                    {gameState.map((rings, pegIndex) => (
                        <div 
                            key={pegIndex} 
                            ref={el => { pegRefs.current[pegIndex] = el; }}
                            className="relative flex justify-center cursor-pointer group" 
                            style={{ width: '128px', height: `${pegVisualHeight + 20}px` }}
                            onClick={() => handlePegClick(pegIndex)}
                        >
                            <div className="absolute bottom-0 w-28 md:w-32 h-5 bg-white/20 rounded-lg shadow-lg"></div>
                            
                            <div 
                                className="absolute bottom-5 flex flex-col-reverse justify-start items-center w-5 bg-white/10 rounded-t-lg pt-[10px] transition-transform duration-200 group-hover:scale-105"
                                style={{ height: `${pegVisualHeight}px` }}
                            >
                                {rings.map((color, ringIndex) => {
                                    const isSelected = selectedRingsInfo?.index === pegIndex && ringIndex >= rings.length - (selectedRingsInfo?.rings.length || 0);
                                    const isSliding = animationInfo?.status === 'sliding' && animationInfo.sourceIndex === pegIndex && ringIndex >= rings.length - (animationInfo.rings?.length || 0);
                                    const isLanding = animationInfo?.status === 'landing' && animationInfo.targetIndex === pegIndex && ringIndex >= rings.length - (animationInfo.rings?.length || 0);

                                    let dynamicStyles: React.CSSProperties = {
                                        height: `${RING_HEIGHT_PX}px`,
                                        marginBottom: `-${RING_OVERLAP_PX}px`
                                    };
                                    let classes = `w-[108px] rounded-full shadow-[inset_0_-5px_10px_rgba(0,0,0,0.2)]`;

                                    if(isSliding && animationInfo) {
                                        const sourceX = (animationInfo.sourceIndex !== undefined) ? pegPositions[animationInfo.sourceIndex] : 0;
                                        const targetX = (animationInfo.targetIndex !== undefined) ? pegPositions[animationInfo.targetIndex] : 0;
                                        const translateX = targetX - sourceX;
                                        dynamicStyles.transform = `translate(${translateX}px, -230px) scale(1.1)`;
                                        dynamicStyles.transition = 'transform 0.4s ease-in-out';
                                    } else if (isSelected) {
                                        dynamicStyles.transform = `translateY(-230px) scale(1.1)`;
                                        dynamicStyles.transition = `transform 0.3s ease-out`;
                                    }

                                    if (isLanding) {
                                        classes += ' animate-drop-in';
                                    }

                                    return (
                                        <div 
                                            key={ringIndex} 
                                            className={`${classes} ${COLOR_MAP[color]}`}
                                            style={dynamicStyles}
                                        ></div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </main>

                <footer className="mt-8">
                    <button 
                        onClick={() => initGame(currentLevel)}
                        className="py-3 px-6 text-base font-semibold rounded-full bg-gradient-to-br from-[#5e54a7] to-[#4e48d] text-gray-100 shadow-lg hover:opacity-90 active:shadow-inner transition-all disabled:opacity-50"
                        disabled={isAnimating}
                    >
                        Reiniciar
                    </button>
                </footer>

                {isWin && (
                    <div className="fixed inset-0 bg-black/70 flex flex-col justify-center items-center text-white text-5xl font-bold text-center z-50">
                        <p className="mb-6 drop-shadow-lg">Você Venceu!</p>
                        <button 
                            onClick={handleNextLevel}
                            className="py-4 px-8 text-xl font-semibold rounded-full bg-gradient-to-br from-[#7b68ee] to-[#6a5acd] text-gray-100 shadow-xl hover:scale-105 transition-transform"
                        >
                            Próximo Nível
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

