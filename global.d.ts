type beatmapOptions = {
    mods: string,
    calc_diff: boolean,
    lb: boolean,
}

type hitCount = {
    count_300: number,
    count_100: number,
    count_50: number,
    count_miss: number,
    [key: string]: any
}

type diffCalcScore = {
    acc?: number,
    n300?: number,
    n100?: number,
    n50?: number,
    nMisses?: number,
    combo?: number,
    mods?: number
}
