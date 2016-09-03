# EXPERIMENTAL

Falcor DataSource implementing generic get/set semantics on AsyncStorage

Stores all JSON Graph atoms as individual key/val pairs

It remains to be seen whether this makes sense re: scaling. Smells like
the React Native folks don’t envision AsyncStorage as being much more than
a small config database?

Although, if RocksDB is the AsyncStorage backend, this might perform OK.
