declare module 'reservoir' {

  interface ReservoirArray<T> extends Array<T> {
    /**
     * datum: one or more elements to consider for inclusion into the reservoir.
     * Returns the current length of the reservoir.
     */
    pushSome(...datum: T[]): number;
  }

  /**
   * Create a new reservoir sampler.
   *
   * @param reservoirSize is the maximum size of the reservoir. This is the number of elements
   *   to be randomly chosen from the input provided to it using pushSome. Default is 1.
   * @param randomNumberGenerator is an optional random number generating function to use in
   *   place of the default Math.random.
   */
  function Reservoir<T>(
    reservoirSize?: number,
    randomNumberGenerator?: () => number
  ): ReservoirArray<T>;

  export = Reservoir;
}
