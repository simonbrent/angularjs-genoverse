(function () {
  // Javascript ZLib
  // By Thomas Down 2010-2011
  //
  // Based very heavily on portions of jzlib (by ymnk@jcraft.com), who in
  // turn credits Jean-loup Gailly and Mark Adler for the original zlib code.
  //
  // inflate.js: ZLib inflate code
  //
  //
  // Shared constants
  //
  var MAX_WBITS = 15; // 32K LZ77 window
  var DEF_WBITS = MAX_WBITS;
  var MAX_MEM_LEVEL = 9;
  var MANY = 1440;
  var BMAX = 15;

  // preset dictionary flag in zlib header
  var PRESET_DICT = 0x20;

  var Z_NO_FLUSH = 0;
  var Z_PARTIAL_FLUSH = 1;
  var Z_SYNC_FLUSH = 2;
  var Z_FULL_FLUSH = 3;
  var Z_FINISH = 4;

  var Z_DEFLATED = 8;

  var Z_OK = 0;
  var Z_STREAM_END = 1;
  var Z_NEED_DICT = 2;
  var Z_ERRNO = -1;
  var Z_STREAM_ERROR = -2;
  var Z_DATA_ERROR = -3;
  var Z_MEM_ERROR = -4;
  var Z_BUF_ERROR = -5;
  var Z_VERSION_ERROR = -6;

  var METHOD = 0; // waiting for method byte
  var FLAG = 1; // waiting for flag byte
  var DICT4 = 2; // four dictionary check bytes to go
  var DICT3 = 3; // three dictionary check bytes to go
  var DICT2 = 4; // two dictionary check bytes to go
  var DICT1 = 5; // one dictionary check byte to go
  var DICT0 = 6; // waiting for inflateSetDictionary
  var BLOCKS = 7; // decompressing blocks
  var CHECK4 = 8; // four check bytes to go
  var CHECK3 = 9; // three check bytes to go
  var CHECK2 = 10; // two check bytes to go
  var CHECK1 = 11; // one check byte to go
  var DONE = 12; // finished check, done
  var BAD = 13; // got an error--stay here

  var inflate_mask = [0x00000000, 0x00000001, 0x00000003, 0x00000007, 0x0000000f, 0x0000001f, 0x0000003f, 0x0000007f, 0x000000ff, 0x000001ff, 0x000003ff, 0x000007ff, 0x00000fff, 0x00001fff, 0x00003fff, 0x00007fff, 0x0000ffff];

  var IB_TYPE = 0; // get type bits (3, including end bit)
  var IB_LENS = 1; // get lengths for stored
  var IB_STORED = 2; // processing stored block
  var IB_TABLE = 3; // get table lengths
  var IB_BTREE = 4; // get bit lengths tree for a dynamic block
  var IB_DTREE = 5; // get length, distance trees for a dynamic block
  var IB_CODES = 6; // processing fixed or dynamic block
  var IB_DRY = 7; // output remaining window bytes
  var IB_DONE = 8; // finished last block, done
  var IB_BAD = 9; // ot a data error--stuck here

  var fixed_bl = 9;
  var fixed_bd = 5;

  var fixed_tl = [
    96, 7, 256, 0, 8, 80, 0, 8, 16, 84, 8, 115,
    82, 7, 31, 0, 8, 112, 0, 8, 48, 0, 9, 192,
    80, 7, 10, 0, 8, 96, 0, 8, 32, 0, 9, 160,
    0, 8, 0, 0, 8, 128, 0, 8, 64, 0, 9, 224,
    80, 7, 6, 0, 8, 88, 0, 8, 24, 0, 9, 144,
    83, 7, 59, 0, 8, 120, 0, 8, 56, 0, 9, 208,
    81, 7, 17, 0, 8, 104, 0, 8, 40, 0, 9, 176,
    0, 8, 8, 0, 8, 136, 0, 8, 72, 0, 9, 240,
    80, 7, 4, 0, 8, 84, 0, 8, 20, 85, 8, 227,
    83, 7, 43, 0, 8, 116, 0, 8, 52, 0, 9, 200,
    81, 7, 13, 0, 8, 100, 0, 8, 36, 0, 9, 168,
    0, 8, 4, 0, 8, 132, 0, 8, 68, 0, 9, 232,
    80, 7, 8, 0, 8, 92, 0, 8, 28, 0, 9, 152,
    84, 7, 83, 0, 8, 124, 0, 8, 60, 0, 9, 216,
    82, 7, 23, 0, 8, 108, 0, 8, 44, 0, 9, 184,
    0, 8, 12, 0, 8, 140, 0, 8, 76, 0, 9, 248,
    80, 7, 3, 0, 8, 82, 0, 8, 18, 85, 8, 163,
    83, 7, 35, 0, 8, 114, 0, 8, 50, 0, 9, 196,
    81, 7, 11, 0, 8, 98, 0, 8, 34, 0, 9, 164,
    0, 8, 2, 0, 8, 130, 0, 8, 66, 0, 9, 228,
    80, 7, 7, 0, 8, 90, 0, 8, 26, 0, 9, 148,
    84, 7, 67, 0, 8, 122, 0, 8, 58, 0, 9, 212,
    82, 7, 19, 0, 8, 106, 0, 8, 42, 0, 9, 180,
    0, 8, 10, 0, 8, 138, 0, 8, 74, 0, 9, 244,
    80, 7, 5, 0, 8, 86, 0, 8, 22, 192, 8, 0,
    83, 7, 51, 0, 8, 118, 0, 8, 54, 0, 9, 204,
    81, 7, 15, 0, 8, 102, 0, 8, 38, 0, 9, 172,
    0, 8, 6, 0, 8, 134, 0, 8, 70, 0, 9, 236,
    80, 7, 9, 0, 8, 94, 0, 8, 30, 0, 9, 156,
    84, 7, 99, 0, 8, 126, 0, 8, 62, 0, 9, 220,
    82, 7, 27, 0, 8, 110, 0, 8, 46, 0, 9, 188,
    0, 8, 14, 0, 8, 142, 0, 8, 78, 0, 9, 252,
    96, 7, 256, 0, 8, 81, 0, 8, 17, 85, 8, 131,
    82, 7, 31, 0, 8, 113, 0, 8, 49, 0, 9, 194,
    80, 7, 10, 0, 8, 97, 0, 8, 33, 0, 9, 162,
    0, 8, 1, 0, 8, 129, 0, 8, 65, 0, 9, 226,
    80, 7, 6, 0, 8, 89, 0, 8, 25, 0, 9, 146,
    83, 7, 59, 0, 8, 121, 0, 8, 57, 0, 9, 210,
    81, 7, 17, 0, 8, 105, 0, 8, 41, 0, 9, 178,
    0, 8, 9, 0, 8, 137, 0, 8, 73, 0, 9, 242,
    80, 7, 4, 0, 8, 85, 0, 8, 21, 80, 8, 258,
    83, 7, 43, 0, 8, 117, 0, 8, 53, 0, 9, 202,
    81, 7, 13, 0, 8, 101, 0, 8, 37, 0, 9, 170,
    0, 8, 5, 0, 8, 133, 0, 8, 69, 0, 9, 234,
    80, 7, 8, 0, 8, 93, 0, 8, 29, 0, 9, 154,
    84, 7, 83, 0, 8, 125, 0, 8, 61, 0, 9, 218,
    82, 7, 23, 0, 8, 109, 0, 8, 45, 0, 9, 186,
    0, 8, 13, 0, 8, 141, 0, 8, 77, 0, 9, 250,
    80, 7, 3, 0, 8, 83, 0, 8, 19, 85, 8, 195,
    83, 7, 35, 0, 8, 115, 0, 8, 51, 0, 9, 198,
    81, 7, 11, 0, 8, 99, 0, 8, 35, 0, 9, 166,
    0, 8, 3, 0, 8, 131, 0, 8, 67, 0, 9, 230,
    80, 7, 7, 0, 8, 91, 0, 8, 27, 0, 9, 150,
    84, 7, 67, 0, 8, 123, 0, 8, 59, 0, 9, 214,
    82, 7, 19, 0, 8, 107, 0, 8, 43, 0, 9, 182,
    0, 8, 11, 0, 8, 139, 0, 8, 75, 0, 9, 246,
    80, 7, 5, 0, 8, 87, 0, 8, 23, 192, 8, 0,
    83, 7, 51, 0, 8, 119, 0, 8, 55, 0, 9, 206,
    81, 7, 15, 0, 8, 103, 0, 8, 39, 0, 9, 174,
    0, 8, 7, 0, 8, 135, 0, 8, 71, 0, 9, 238,
    80, 7, 9, 0, 8, 95, 0, 8, 31, 0, 9, 158,
    84, 7, 99, 0, 8, 127, 0, 8, 63, 0, 9, 222,
    82, 7, 27, 0, 8, 111, 0, 8, 47, 0, 9, 190,
    0, 8, 15, 0, 8, 143, 0, 8, 79, 0, 9, 254,
    96, 7, 256, 0, 8, 80, 0, 8, 16, 84, 8, 115,
    82, 7, 31, 0, 8, 112, 0, 8, 48, 0, 9, 193,

    80, 7, 10, 0, 8, 96, 0, 8, 32, 0, 9, 161,
    0, 8, 0, 0, 8, 128, 0, 8, 64, 0, 9, 225,
    80, 7, 6, 0, 8, 88, 0, 8, 24, 0, 9, 145,
    83, 7, 59, 0, 8, 120, 0, 8, 56, 0, 9, 209,
    81, 7, 17, 0, 8, 104, 0, 8, 40, 0, 9, 177,
    0, 8, 8, 0, 8, 136, 0, 8, 72, 0, 9, 241,
    80, 7, 4, 0, 8, 84, 0, 8, 20, 85, 8, 227,
    83, 7, 43, 0, 8, 116, 0, 8, 52, 0, 9, 201,
    81, 7, 13, 0, 8, 100, 0, 8, 36, 0, 9, 169,
    0, 8, 4, 0, 8, 132, 0, 8, 68, 0, 9, 233,
    80, 7, 8, 0, 8, 92, 0, 8, 28, 0, 9, 153,
    84, 7, 83, 0, 8, 124, 0, 8, 60, 0, 9, 217,
    82, 7, 23, 0, 8, 108, 0, 8, 44, 0, 9, 185,
    0, 8, 12, 0, 8, 140, 0, 8, 76, 0, 9, 249,
    80, 7, 3, 0, 8, 82, 0, 8, 18, 85, 8, 163,
    83, 7, 35, 0, 8, 114, 0, 8, 50, 0, 9, 197,
    81, 7, 11, 0, 8, 98, 0, 8, 34, 0, 9, 165,
    0, 8, 2, 0, 8, 130, 0, 8, 66, 0, 9, 229,
    80, 7, 7, 0, 8, 90, 0, 8, 26, 0, 9, 149,
    84, 7, 67, 0, 8, 122, 0, 8, 58, 0, 9, 213,
    82, 7, 19, 0, 8, 106, 0, 8, 42, 0, 9, 181,
    0, 8, 10, 0, 8, 138, 0, 8, 74, 0, 9, 245,
    80, 7, 5, 0, 8, 86, 0, 8, 22, 192, 8, 0,
    83, 7, 51, 0, 8, 118, 0, 8, 54, 0, 9, 205,
    81, 7, 15, 0, 8, 102, 0, 8, 38, 0, 9, 173,
    0, 8, 6, 0, 8, 134, 0, 8, 70, 0, 9, 237,
    80, 7, 9, 0, 8, 94, 0, 8, 30, 0, 9, 157,
    84, 7, 99, 0, 8, 126, 0, 8, 62, 0, 9, 221,
    82, 7, 27, 0, 8, 110, 0, 8, 46, 0, 9, 189,
    0, 8, 14, 0, 8, 142, 0, 8, 78, 0, 9, 253,
    96, 7, 256, 0, 8, 81, 0, 8, 17, 85, 8, 131,
    82, 7, 31, 0, 8, 113, 0, 8, 49, 0, 9, 195,
    80, 7, 10, 0, 8, 97, 0, 8, 33, 0, 9, 163,
    0, 8, 1, 0, 8, 129, 0, 8, 65, 0, 9, 227,
    80, 7, 6, 0, 8, 89, 0, 8, 25, 0, 9, 147,
    83, 7, 59, 0, 8, 121, 0, 8, 57, 0, 9, 211,
    81, 7, 17, 0, 8, 105, 0, 8, 41, 0, 9, 179,
    0, 8, 9, 0, 8, 137, 0, 8, 73, 0, 9, 243,
    80, 7, 4, 0, 8, 85, 0, 8, 21, 80, 8, 258,
    83, 7, 43, 0, 8, 117, 0, 8, 53, 0, 9, 203,
    81, 7, 13, 0, 8, 101, 0, 8, 37, 0, 9, 171,
    0, 8, 5, 0, 8, 133, 0, 8, 69, 0, 9, 235,
    80, 7, 8, 0, 8, 93, 0, 8, 29, 0, 9, 155,
    84, 7, 83, 0, 8, 125, 0, 8, 61, 0, 9, 219,
    82, 7, 23, 0, 8, 109, 0, 8, 45, 0, 9, 187,
    0, 8, 13, 0, 8, 141, 0, 8, 77, 0, 9, 251,
    80, 7, 3, 0, 8, 83, 0, 8, 19, 85, 8, 195,
    83, 7, 35, 0, 8, 115, 0, 8, 51, 0, 9, 199,
    81, 7, 11, 0, 8, 99, 0, 8, 35, 0, 9, 167,
    0, 8, 3, 0, 8, 131, 0, 8, 67, 0, 9, 231,
    80, 7, 7, 0, 8, 91, 0, 8, 27, 0, 9, 151,
    84, 7, 67, 0, 8, 123, 0, 8, 59, 0, 9, 215,
    82, 7, 19, 0, 8, 107, 0, 8, 43, 0, 9, 183,
    0, 8, 11, 0, 8, 139, 0, 8, 75, 0, 9, 247,
    80, 7, 5, 0, 8, 87, 0, 8, 23, 192, 8, 0,
    83, 7, 51, 0, 8, 119, 0, 8, 55, 0, 9, 207,
    81, 7, 15, 0, 8, 103, 0, 8, 39, 0, 9, 175,
    0, 8, 7, 0, 8, 135, 0, 8, 71, 0, 9, 239,
    80, 7, 9, 0, 8, 95, 0, 8, 31, 0, 9, 159,
    84, 7, 99, 0, 8, 127, 0, 8, 63, 0, 9, 223,
    82, 7, 27, 0, 8, 111, 0, 8, 47, 0, 9, 191,
    0, 8, 15, 0, 8, 143, 0, 8, 79, 0, 9, 255
  ];
  var fixed_td = [
    80, 5, 1, 87, 5, 257, 83, 5, 17, 91, 5, 4097,
    81, 5, 5, 89, 5, 1025, 85, 5, 65, 93, 5, 16385,
    80, 5, 3, 88, 5, 513, 84, 5, 33, 92, 5, 8193,
    82, 5, 9, 90, 5, 2049, 86, 5, 129, 192, 5, 24577,
    80, 5, 2, 87, 5, 385, 83, 5, 25, 91, 5, 6145,
    81, 5, 7, 89, 5, 1537, 85, 5, 97, 93, 5, 24577,
    80, 5, 4, 88, 5, 769, 84, 5, 49, 92, 5, 12289,
    82, 5, 13, 90, 5, 3073, 86, 5, 193, 192, 5, 24577
  ];

  // Tables for deflate from PKZIP's appnote.txt.
  var cplens = [ // Copy lengths for literal codes 257..285
    3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31,
    35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258, 0, 0
  ];

  // see note #13 above about 258
  var cplext = [ // Extra bits for literal codes 257..285
    0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2,
    3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0, 112, 112 // 112==invalid
  ];

  var cpdist = [ // Copy offsets for distance codes 0..29
    1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193,
    257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145,
    8193, 12289, 16385, 24577
  ];

  var cpdext = [ // Extra bits for distance codes
    0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6,
    7, 7, 8, 8, 9, 9, 10, 10, 11, 11,
    12, 12, 13, 13
  ];

  //
  // ZStream.java
  //

  function ZStream() {}

  ZStream.prototype.inflateInit = function(w, nowrap) {
    if (!w) {
      w = DEF_WBITS;
    }

    if (nowrap) {
      nowrap = false;
    }

    this.istate = new Inflate();

    return this.istate.inflateInit(this, nowrap ? -w : w);
  };

  ZStream.prototype.inflate = function(f) {
    if (this.istate == null) {
      return Z_STREAM_ERROR;
    }

    return this.istate.inflate(this, f);
  };

  ZStream.prototype.inflateEnd = function() {
    if (this.istate == null) {
      return Z_STREAM_ERROR;
    }

    var ret = istate.inflateEnd(this);
    this.istate = null;
    return ret;
  };

  ZStream.prototype.inflateSync = function() {
    // if(istate == null) return Z_STREAM_ERROR;
    return istate.inflateSync(this);
  };

  ZStream.prototype.inflateSetDictionary = function(dictionary, dictLength) {
    // if(istate == null) return Z_STREAM_ERROR;
    return istate.inflateSetDictionary(this, dictionary, dictLength);
  };

  /*

    public int deflateInit(int level){
      return deflateInit(level, MAX_WBITS);
    }
    public int deflateInit(int level, boolean nowrap){
      return deflateInit(level, MAX_WBITS, nowrap);
    }
    public int deflateInit(int level, int bits){
      return deflateInit(level, bits, false);
    }
    public int deflateInit(int level, int bits, boolean nowrap){
      dstate=new Deflate();
      return dstate.deflateInit(this, level, nowrap?-bits:bits);
    }
    public int deflate(int flush){
      if(dstate==null){
        return Z_STREAM_ERROR;
      }
      return dstate.deflate(this, flush);
    }
    public int deflateEnd(){
      if(dstate==null) return Z_STREAM_ERROR;
      int ret=dstate.deflateEnd();
      dstate=null;
      return ret;
    }
    public int deflateParams(int level, int strategy){
      if(dstate==null) return Z_STREAM_ERROR;
      return dstate.deflateParams(this, level, strategy);
    }
    public int deflateSetDictionary (byte[] dictionary, int dictLength){
      if(dstate == null)
        return Z_STREAM_ERROR;
      return dstate.deflateSetDictionary(this, dictionary, dictLength);
    }

  */

  /*
    // Flush as much pending output as possible. All deflate() output goes
    // through this function so some applications may wish to modify it
    // to avoid allocating a large strm->next_out buffer and copying into it.
    // (See also read_buf()).
    void flush_pending(){
      int len=dstate.pending;

      if(len>avail_out) len=avail_out;
      if(len==0) return;

      if(dstate.pending_buf.length<=dstate.pending_out ||
         next_out.length<=next_out_index ||
         dstate.pending_buf.length<(dstate.pending_out+len) ||
         next_out.length<(next_out_index+len)){
        System.out.println(dstate.pending_buf.length+", "+dstate.pending_out+
  			 ", "+next_out.length+", "+next_out_index+", "+len);
        System.out.println("avail_out="+avail_out);
      }

      System.arraycopy(dstate.pending_buf, dstate.pending_out,
  		     next_out, next_out_index, len);

      next_out_index+=len;
      dstate.pending_out+=len;
      total_out+=len;
      avail_out-=len;
      dstate.pending-=len;
      if(dstate.pending==0){
        dstate.pending_out=0;
      }
    }

    // Read a new buffer from the current input stream, update the adler32
    // and total number of bytes read.  All deflate() input goes through
    // this function so some applications may wish to modify it to avoid
    // allocating a large strm->next_in buffer and copying from it.
    // (See also flush_pending()).
    int read_buf(byte[] buf, int start, int size) {
      int len=avail_in;

      if(len>size) len=size;
      if(len==0) return 0;

      avail_in-=len;

      if(dstate.noheader==0) {
        adler=_adler.adler32(adler, next_in, next_in_index, len);
      }
      System.arraycopy(next_in, next_in_index, buf, start, len);
      next_in_index  += len;
      total_in += len;
      return len;
    }

    public void free(){
      next_in=null;
      next_out=null;
      msg=null;
      _adler=null;
    }
  }
  */


  //
  // Inflate.java
  //

  function Inflate() {
    this.was = [0];
  }

  Inflate.prototype.inflateReset = function(z) {
    if (z == null || z.istate == null) {
      return Z_STREAM_ERROR;
    }

    z.total_in = z.total_out = 0;
    z.msg = null;
    z.istate.mode = z.istate.nowrap != 0 ? BLOCKS : METHOD;
    z.istate.blocks.reset(z, null);
    return Z_OK;
  };

  Inflate.prototype.inflateEnd = function(z) {
    if (this.blocks != null) {
      this.blocks.free(z);
    }

    this.blocks = null;
    return Z_OK;
  };

  Inflate.prototype.inflateInit = function(z, w) {
    z.msg = null;
    this.blocks = null;

    // handle undocumented nowrap option (no zlib header or check)
    nowrap = 0;

    if (w < 0) {
      w = -w;
      nowrap = 1;
    }

    // set window size
    if (w < 8 || w > 15) {
      this.inflateEnd(z);
      return Z_STREAM_ERROR;
    }

    this.wbits = w;

    z.istate.blocks = new InfBlocks(z, z.istate.nowrap != 0 ? null : this, 1 << w);

    // reset state
    this.inflateReset(z);
    return Z_OK;
  };

  Inflate.prototype.inflate = function(z, f) {
    var r, b;

    if (z == null || z.istate == null || z.next_in == null) {
      return Z_STREAM_ERROR;
    }

    f = f == Z_FINISH ? Z_BUF_ERROR : Z_OK;
    r = Z_BUF_ERROR;

    while (true) {
      switch (z.istate.mode) {
        case METHOD:

          if (z.avail_in == 0) {
            return r;
          }

          r = f;

          z.avail_in--;
          z.total_in++;

          if (((z.istate.method = z.next_in[z.next_in_index++]) & 0xf) != Z_DEFLATED) {
            z.istate.mode = BAD;
            z.msg = "unknown compression method";
            z.istate.marker = 5; // can't try inflateSync
            break;
          }

          if ((z.istate.method >> 4) + 8 > z.istate.wbits) {
            z.istate.mode = BAD;
            z.msg = "invalid window size";
            z.istate.marker = 5; // can't try inflateSync
            break;
          }

          z.istate.mode = FLAG;
        case FLAG:
          if (z.avail_in == 0) {
            return r;
          }

          r = f;

          z.avail_in--;
          z.total_in++;
          b = (z.next_in[z.next_in_index++]) & 0xff;

          if ((((z.istate.method << 8) + b) % 31) != 0) {
            z.istate.mode = BAD;
            z.msg = "incorrect header check";
            z.istate.marker = 5; // can't try inflateSync
            break;
          }

          if ((b & PRESET_DICT) == 0) {
            z.istate.mode = BLOCKS;
            break;
          }

          z.istate.mode = DICT4;
        case DICT4:
          if (z.avail_in == 0) {
            return r;
          }

          r = f;

          z.avail_in--;
          z.total_in++;
          z.istate.need = ((z.next_in[z.next_in_index++] & 0xff) << 24) & 0xff000000;
          z.istate.mode = DICT3;
        case DICT3:
          if (z.avail_in == 0) {
            return r;
          }

          r = f;

          z.avail_in--;
          z.total_in++;
          z.istate.need += ((z.next_in[z.next_in_index++] & 0xff) << 16) & 0xff0000;
          z.istate.mode = DICT2;
        case DICT2:
          if (z.avail_in == 0) {
            return r;
          }

          r = f;

          z.avail_in--;
          z.total_in++;
          z.istate.need += ((z.next_in[z.next_in_index++] & 0xff) << 8) & 0xff00;
          z.istate.mode = DICT1;
        case DICT1:
          if (z.avail_in == 0) {
            return r;
          }

          r = f;

          z.avail_in--;
          z.total_in++;
          z.istate.need += (z.next_in[z.next_in_index++] & 0xff);
          z.adler = z.istate.need;
          z.istate.mode = DICT0;
          return Z_NEED_DICT;
        case DICT0:
          z.istate.mode = BAD;
          z.msg = "need dictionary";
          z.istate.marker = 0; // can try inflateSync
          return Z_STREAM_ERROR;
        case BLOCKS:
          r = z.istate.blocks.proc(z, r);

          if (r == Z_DATA_ERROR) {
            z.istate.mode = BAD;
            z.istate.marker = 0; // can try inflateSync
            break;
          }

          if (r == Z_OK) {
            r = f;
          }

          if (r != Z_STREAM_END) {
            return r;
          }

          r = f;
          z.istate.blocks.reset(z, z.istate.was);

          if (z.istate.nowrap != 0) {
            z.istate.mode = DONE;
            break;
          }

          z.istate.mode = CHECK4;
        case CHECK4:
          if (z.avail_in == 0) {
            return r;
          }

          r = f;

          z.avail_in--;
          z.total_in++;
          z.istate.need = ((z.next_in[z.next_in_index++] & 0xff) << 24) & 0xff000000;
          z.istate.mode = CHECK3;
        case CHECK3:
          if (z.avail_in == 0) {
            return r;
          }

          r = f;

          z.avail_in--;
          z.total_in++;
          z.istate.need += ((z.next_in[z.next_in_index++] & 0xff) << 16) & 0xff0000;
          z.istate.mode = CHECK2;
        case CHECK2:
          if (z.avail_in == 0) {
            return r;
          }

          r = f;

          z.avail_in--;
          z.total_in++;
          z.istate.need += ((z.next_in[z.next_in_index++] & 0xff) << 8) & 0xff00;
          z.istate.mode = CHECK1;
        case CHECK1:
          if (z.avail_in == 0) {
            return r;
          }

          r = f;

          z.avail_in--;
          z.total_in++;
          z.istate.need += (z.next_in[z.next_in_index++] & 0xff);

          if (((z.istate.was[0])) != ((z.istate.need))) {
            z.istate.mode = BAD;
            z.msg = "incorrect data check";
            z.istate.marker = 5; // can't try inflateSync
            break;
          }

          z.istate.mode = DONE;
        case DONE:
          return Z_STREAM_END;
        case BAD:
          return Z_DATA_ERROR;
        default:
          return Z_STREAM_ERROR;
      }
    }
  };

  Inflate.prototype.inflateSetDictionary = function(z, dictionary, dictLength) {
    var index = 0;
    var length = dictLength;

    if (z == null || z.istate == null || z.istate.mode != DICT0) {
      return Z_STREAM_ERROR;
    }

    if (z._adler.adler32(1, dictionary, 0, dictLength) != z.adler) {
      return Z_DATA_ERROR;
    }

    z.adler = z._adler.adler32(0, null, 0, 0);

    if (length >= (1 << z.istate.wbits)) {
      length = (1 << z.istate.wbits) - 1;
      index = dictLength - length;
    }

    z.istate.blocks.set_dictionary(dictionary, index, length);
    z.istate.mode = BLOCKS;
    return Z_OK;
  };

  //  static private byte[] mark = {(byte)0, (byte)0, (byte)0xff, (byte)0xff};
  var mark = [0, 0, 255, 255];

  Inflate.prototype.inflateSync = function(z) {
    var n; // number of bytes to look at
    var p; // pointer to bytes
    var m; // number of marker bytes found in a row
    var r, w; // temporaries to save total_in and total_out

    // set up
    if (z == null || z.istate == null) {
      return Z_STREAM_ERROR;
    }

    if (z.istate.mode != BAD) {
      z.istate.mode = BAD;
      z.istate.marker = 0;
    }

    if ((n = z.avail_in) == 0) {
      return Z_BUF_ERROR;
    }

    p = z.next_in_index;
    m = z.istate.marker;

    // search
    while (n != 0 && m < 4) {
      if (z.next_in[p] == mark[m]) {
        m++;
      } else if (z.next_in[p] != 0) {
        m = 0;
      } else {
        m = 4 - m;
      }

      p++;
      n--;
    }

    // restore
    z.total_in += p - z.next_in_index;
    z.next_in_index = p;
    z.avail_in = n;
    z.istate.marker = m;

    // return no joy or set up to restart on a new block
    if (m != 4) {
      return Z_DATA_ERROR;
    }

    r = z.total_in;
    w = z.total_out;
    this.inflateReset(z);
    z.total_in = r;
    z.total_out = w;
    z.istate.mode = BLOCKS;
    return Z_OK;
  };

  // Returns true if inflate is currently at the end of a block generated
  // by Z_SYNC_FLUSH or Z_FULL_FLUSH. This function is used by one PPP
  // implementation to provide an additional safety check. PPP uses Z_SYNC_FLUSH
  // but removes the length bytes of the resulting empty stored block. When
  // decompressing, PPP checks that at the end of input packet, inflate is
  // waiting for these length bytes.
  Inflate.prototype.inflateSyncPoint = function(z) {
    if (z == null || z.istate == null || z.istate.blocks == null) {
      return Z_STREAM_ERROR;
    }

    return z.istate.blocks.sync_point();
  };


  //
  // InfBlocks.java
  //

  var INFBLOCKS_BORDER = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];

  function InfBlocks(z, checkfn, w) {
    this.hufts = new Int32Array(MANY * 3);
    this.window = new Uint8Array(w);
    this.end = w;
    this.checkfn = checkfn;
    this.mode = IB_TYPE;
    this.reset(z, null);

    this.left = 0; // if STORED, bytes left to copy

    this.table = 0; // table lengths (14 bits)
    this.index = 0; // index into blens (or border)
    this.blens = null; // bit lengths of codes
    this.bb = new Int32Array(1); // bit length tree depth
    this.tb = new Int32Array(1); // bit length decoding tree

    this.codes = new InfCodes();

    this.last = 0; // true if this block is the last block

    // mode independent information
    this.bitk = 0; // bits in bit buffer
    this.bitb = 0; // bit buffer
    this.read = 0; // window read pointer
    this.write = 0; // window write pointer
    this.check = 0; // check on output

    this.inftree = new InfTree();
  }

  InfBlocks.prototype.reset = function(z, c) {
    if (c) {
      c[0] = this.check;
    }

    if (this.mode == IB_CODES) {
      this.codes.free(z);
    }

    this.mode = IB_TYPE;
    this.bitk = 0;
    this.bitb = 0;
    this.read = this.write = 0;

    if (this.checkfn) {
      z.adler = this.check = z._adler.adler32(0, null, 0, 0);
    }
  };

  InfBlocks.prototype.proc = function(z, r) {
    var t; // temporary storage
    var b; // bit buffer
    var k; // bits in bit buffer
    var p; // input data pointer
    var n; // bytes available there
    var q; // output window write pointer
    var m; // bytes to end of window or read pointer

    // copy input/output information to locals (UPDATE macro restores)
    {
      p = z.next_in_index;
      n = z.avail_in;
      b = this.bitb;
      k = this.bitk;
    } {
      q = this.write;
      m = (q < this.read ? this.read - q - 1 : this.end - q);
    }

    // process input based on current state
    while (true) {
      switch (this.mode) {
        case IB_TYPE:
          while (k < (3)) {
            if (n != 0) {
              r = Z_OK;
            } else {
              this.bitb = b;
              this.bitk = k;
              z.avail_in = n;
              z.total_in += p - z.next_in_index;
              z.next_in_index = p;
              this.write = q;
              return this.inflate_flush(z, r);
            }

            n--;
            b |= (z.next_in[p++] & 0xff) << k;
            k += 8;
          }

          t = (b & 7);
          this.last = t & 1;

          switch (t >>> 1) {
            case 0: // stored
              {
                b >>>= (3);
                k -= (3);
              }

              t = k & 7; // go to byte boundary

              {
                b >>>= (t);
                k -= (t);
              }

              this.mode = IB_LENS; // get length of stored block
              break;
            case 1: // fixed
              {
                var bl = new Int32Array(1);
                var bd = new Int32Array(1);
                var tl = [];
                var td = [];

                inflate_trees_fixed(bl, bd, tl, td, z);
                this.codes.init(bl[0], bd[0], tl[0], 0, td[0], 0, z);
              }

              {
                b >>>= (3);
                k -= (3);
              }

              this.mode = IB_CODES;
              break;
            case 2: // dynamic
              {
                b >>>= (3);k -= (3);
              }

              this.mode = IB_TABLE;
              break;
            case 3: // illegal
              {
                b >>>= (3);k -= (3);
              }

              this.mode = BAD;
              z.msg = "invalid block type";
              r = Z_DATA_ERROR;

              this.bitb = b;
              this.bitk = k;
              z.avail_in = n;
              z.total_in += p - z.next_in_index;
              z.next_in_index = p;
              this.write = q;
              return this.inflate_flush(z, r);
          }

          break;
        case IB_LENS:
          while (k < (32)) {
            if (n != 0) {
              r = Z_OK;
            } else {
              this.bitb = b;
              this.bitk = k;
              z.avail_in = n;
              z.total_in += p - z.next_in_index;
              z.next_in_index = p;
              this.write = q;
              return this.inflate_flush(z, r);
            }

            n--;
            b |= (z.next_in[p++] & 0xff) << k;
            k += 8;
          }

          if ((((~b) >>> 16) & 0xffff) != (b & 0xffff)) {
            this.mode = BAD;
            z.msg = "invalid stored block lengths";
            r = Z_DATA_ERROR;

            this.bitb = b;
            this.bitk = k;
            z.avail_in = n;
            z.total_in += p - z.next_in_index;
            z.next_in_index = p;
            this.write = q;
            return this.inflate_flush(z, r);
          }

          this.left = (b & 0xffff);
          b = k = 0; // dump bits
          this.mode = this.left != 0 ? IB_STORED : (this.last != 0 ? IB_DRY : IB_TYPE);
          break;
        case IB_STORED:
          if (n == 0) {
            this.bitb = b;
            this.bitk = k;
            z.avail_in = n;
            z.total_in += p - z.next_in_index;
            z.next_in_index = p;
            write = q;
            return this.inflate_flush(z, r);
          }

          if (m == 0) {
            if (q == end && read != 0) {
              q = 0;
              m = (q < this.read ? this.read - q - 1 : this.end - q);
            }

            if (m == 0) {
              this.write = q;
              r = this.inflate_flush(z, r);
              q = this.write;
              m = (q < this.read ? this.read - q - 1 : this.end - q);

              if (q == this.end && this.read != 0) {
                q = 0;
                m = (q < this.read ? this.read - q - 1 : this.end - q);
              }

              if (m == 0) {
                this.bitb = b;
                this.bitk = k;
                z.avail_in = n;
                z.total_in += p - z.next_in_index;
                z.next_in_index = p;
                this.write = q;
                return this.inflate_flush(z, r);
              }
            }
          }

          r = Z_OK;

          t = this.left;

          if (t > n) {
            t = n;
          }

          if (t > m) {
            t = m;
          }

          arrayCopy(z.next_in, p, this.window, q, t);
          p += t;
          n -= t;
          q += t;
          m -= t;

          if ((this.left -= t) != 0) {
            break;
          }

          this.mode = (this.last != 0 ? IB_DRY : IB_TYPE);
          break;
        case IB_TABLE:
          while (k < (14)) {
            if (n != 0) {
              r = Z_OK;
            } else {
              this.bitb = b;
              this.bitk = k;
              z.avail_in = n;
              z.total_in += p - z.next_in_index;
              z.next_in_index = p;
              this.write = q;
              return this.inflate_flush(z, r);
            }

            n--;
            b |= (z.next_in[p++] & 0xff) << k;
            k += 8;
          }

          this.table = t = (b & 0x3fff);

          if ((t & 0x1f) > 29 || ((t >> 5) & 0x1f) > 29) {
            this.mode = IB_BAD;
            z.msg = "too many length or distance symbols";
            r = Z_DATA_ERROR;

            this.bitb = b;
            this.bitk = k;
            z.avail_in = n;
            z.total_in += p - z.next_in_index;
            z.next_in_index = p;
            this.write = q;
            return this.inflate_flush(z, r);
          }

          t = 258 + (t & 0x1f) + ((t >> 5) & 0x1f);

          if (this.blens == null || this.blens.length < t) {
            this.blens = new Int32Array(t);
          } else {
            for (var i = 0; i < t; i++) {
              this.blens[i] = 0;
            }
          }

          {
            b >>>= (14);
            k -= (14);
          }

          this.index = 0;
          mode = IB_BTREE;
        case IB_BTREE:
          while (this.index < 4 + (this.table >>> 10)) {
            while (k < (3)) {
              if (n != 0) {
                r = Z_OK;
              } else {
                this.bitb = b;
                this.bitk = k;
                z.avail_in = n;
                z.total_in += p - z.next_in_index;
                z.next_in_index = p;
                this.write = q;
                return this.inflate_flush(z, r);
              }

              n--;
              b |= (z.next_in[p++] & 0xff) << k;
              k += 8;
            }

            this.blens[INFBLOCKS_BORDER[this.index++]] = b & 7;

            {
              b >>>= (3);
              k -= (3);
            }
          }

          while (this.index < 19) {
            this.blens[INFBLOCKS_BORDER[this.index++]] = 0;
          }

          this.bb[0] = 7;
          t = this.inftree.inflate_trees_bits(this.blens, this.bb, this.tb, this.hufts, z);

          if (t != Z_OK) {
            r = t;

            if (r == Z_DATA_ERROR) {
              this.blens = null;
              this.mode = IB_BAD;
            }

            this.bitb = b;
            this.bitk = k;
            z.avail_in = n;
            z.total_in += p - z.next_in_index;
            z.next_in_index = p;
            write = q;
            return this.inflate_flush(z, r);
          }

          this.index = 0;
          this.mode = IB_DTREE;
        case IB_DTREE:
          while (true) {
            t = this.table;

            if (!(this.index < 258 + (t & 0x1f) + ((t >> 5) & 0x1f))) {
              break;
            }

            var h; //int[]
            var i, j, c;

            t = this.bb[0];

            while (k < (t)) {
              if (n != 0) {
                r = Z_OK;
              } else {
                this.bitb = b;
                this.bitk = k;
                z.avail_in = n;
                z.total_in += p - z.next_in_index;
                z.next_in_index = p;
                this.write = q;
                return this.inflate_flush(z, r);
              }

              n--;
              b |= (z.next_in[p++] & 0xff) << k;
              k += 8;
            }

            //	  if (this.tb[0]==-1){
            //            dlog("null...");
            //	  }

            t = this.hufts[(this.tb[0] + (b & inflate_mask[t])) * 3 + 1];
            c = this.hufts[(this.tb[0] + (b & inflate_mask[t])) * 3 + 2];

            if (c < 16) {
              b >>>= (t);
              k -= (t);
              this.blens[this.index++] = c;
            } else { // c == 16..18
              i = c == 18 ? 7 : c - 14;
              j = c == 18 ? 11 : 3;

              while (k < (t + i)) {
                if (n != 0) {
                  r = Z_OK;
                } else {
                  this.bitb = b;
                  this.bitk = k;
                  z.avail_in = n;
                  z.total_in += p - z.next_in_index;
                  z.next_in_index = p;
                  this.write = q;
                  return this.inflate_flush(z, r);
                }

                n--;
                b |= (z.next_in[p++] & 0xff) << k;
                k += 8;
              }

              b >>>= (t);
              k -= (t);

              j += (b & inflate_mask[i]);

              b >>>= (i);
              k -= (i);

              i = this.index;
              t = this.table;

              if (i + j > 258 + (t & 0x1f) + ((t >> 5) & 0x1f) || (c == 16 && i < 1)) {
                this.blens = null;
                this.mode = IB_BAD;
                z.msg = "invalid bit length repeat";
                r = Z_DATA_ERROR;

                this.bitb = b;
                this.bitk = k;
                z.avail_in = n;
                z.total_in += p - z.next_in_index;
                z.next_in_index = p;
                this.write = q;
                return this.inflate_flush(z, r);
              }

              c = c == 16 ? this.blens[i - 1] : 0;

              do {
                this.blens[i++] = c;
              } while (--j != 0);

              this.index = i;
            }
          }

          this.tb[0] = -1;

          {
            var bl = new Int32Array(1);
            var bd = new Int32Array(1);
            var tl = new Int32Array(1);
            var td = new Int32Array(1);
            bl[0] = 9; // must be <= 9 for lookahead assumptions
            bd[0] = 6; // must be <= 9 for lookahead assumptions

            t = this.table;
            t = this.inftree.inflate_trees_dynamic(257 + (t & 0x1f), 1 + ((t >> 5) & 0x1f), this.blens, bl, bd, tl, td, this.hufts, z);

            if (t != Z_OK) {
              if (t == Z_DATA_ERROR) {
                this.blens = null;
                this.mode = BAD;
              }

              r = t;

              this.bitb = b;
              this.bitk = k;
              z.avail_in = n;
              z.total_in += p - z.next_in_index;
              z.next_in_index = p;
              this.write = q;
              return this.inflate_flush(z, r);
            }
            this.codes.init(bl[0], bd[0], this.hufts, tl[0], this.hufts, td[0], z);
          }

          this.mode = IB_CODES;
        case IB_CODES:
          this.bitb = b;
          this.bitk = k;
          z.avail_in = n;
          z.total_in += p - z.next_in_index;
          z.next_in_index = p;
          this.write = q;

          if ((r = this.codes.proc(this, z, r)) != Z_STREAM_END) {
            return this.inflate_flush(z, r);
          }

          r = Z_OK;
          this.codes.free(z);

          p = z.next_in_index;
          n = z.avail_in;
          b = this.bitb;
          k = this.bitk;
          q = this.write;
          m = (q < this.read ? this.read - q - 1 : this.end - q);

          if (this.last == 0) {
            this.mode = IB_TYPE;
            break;
          }

          this.mode = IB_DRY;
        case IB_DRY:
          this.write = q;
          r = this.inflate_flush(z, r);
          q = this.write;
          m = (q < this.read ? this.read - q - 1 : this.end - q);

          if (this.read != this.write) {
            this.bitb = b;
            this.bitk = k;
            z.avail_in = n;
            z.total_in += p - z.next_in_index;
            z.next_in_index = p;
            this.write = q;
            return this.inflate_flush(z, r);
          }

          mode = DONE;
        case IB_DONE:
          r = Z_STREAM_END;

          this.bitb = b;
          this.bitk = k;
          z.avail_in = n;
          z.total_in += p - z.next_in_index;
          z.next_in_index = p;
          this.write = q;
          return this.inflate_flush(z, r);
        case IB_BAD:
          r = Z_DATA_ERROR;

          this.bitb = b;
          this.bitk = k;
          z.avail_in = n;
          z.total_in += p - z.next_in_index;
          z.next_in_index = p;
          this.write = q;
          return this.inflate_flush(z, r);
        default:
          r = Z_STREAM_ERROR;

          this.bitb = b;
          this.bitk = k;
          z.avail_in = n;
          z.total_in += p - z.next_in_index;
          z.next_in_index = p;
          this.write = q;
          return this.inflate_flush(z, r);
      }
    }
  };

  InfBlocks.prototype.free = function(z) {
    this.reset(z, null);
    this.window = null;
    this.hufts = null;
  };

  InfBlocks.prototype.set_dictionary = function(d, start, n) {
    arrayCopy(d, start, window, 0, n);
    this.read = this.write = n;
  };

  // Returns true if inflate is currently at the end of a block generated
  // by Z_SYNC_FLUSH or Z_FULL_FLUSH.
  InfBlocks.prototype.sync_point = function() {
    return this.mode == IB_LENS;
  };

  // copy as much as possible from the sliding window to the output area
  InfBlocks.prototype.inflate_flush = function(z, r) {
    var n;
    var p;
    var q;

    // local copies of source and destination pointers
    p = z.next_out_index;
    q = this.read;

    // compute number of bytes to copy as far as end of window
    n = ((q <= this.write ? this.write : this.end) - q);

    if (n > z.avail_out) {
      n = z.avail_out;
    }

    if (n != 0 && r == Z_BUF_ERROR) {
      r = Z_OK;
    }

    // update counters
    z.avail_out -= n;
    z.total_out += n;

    // update check information
    if (this.checkfn != null) {
      z.adler = this.check = z._adler.adler32(this.check, this.window, q, n);
    }

    // copy as far as end of window
    arrayCopy(this.window, q, z.next_out, p, n);
    p += n;
    q += n;

    // see if more to copy at beginning of window
    if (q == this.end) {
      // wrap pointers
      q = 0;

      if (this.write == this.end) {
        this.write = 0;
      }

      // compute bytes to copy
      n = this.write - q;

      if (n > z.avail_out) {
        n = z.avail_out;
      }

      if (n != 0 && r == Z_BUF_ERROR) {
        r = Z_OK;
      }

      // update counters
      z.avail_out -= n;
      z.total_out += n;

      // update check information
      if (this.checkfn != null) {
        z.adler = this.check = z._adler.adler32(this.check, this.window, q, n);
      }

      // copy
      arrayCopy(this.window, q, z.next_out, p, n);
      p += n;
      q += n;
    }

    // update pointers
    z.next_out_index = p;
    this.read = q;

    // done
    return r;
  };

  //
  // InfCodes.java
  //

  var IC_START = 0; // x: set up for LEN
  var IC_LEN = 1; // i: get length/literal/eob next
  var IC_LENEXT = 2; // i: getting length extra (have base)
  var IC_DIST = 3; // i: get distance next
  var IC_DISTEXT = 4; // i: getting distance extra
  var IC_COPY = 5; // o: copying bytes in window, waiting for space
  var IC_LIT = 6; // o: got literal, waiting for output space
  var IC_WASH = 7; // o: got eob, possibly still output waiting
  var IC_END = 8; // x: got eob and all data flushed
  var IC_BADCODE = 9; // x: got error

  function InfCodes() {}

  InfCodes.prototype.init = function(bl, bd, tl, tl_index, td, td_index, z) {
    this.mode = IC_START;
    this.lbits = bl;
    this.dbits = bd;
    this.ltree = tl;
    this.ltree_index = tl_index;
    this.dtree = td;
    this.dtree_index = td_index;
    this.tree = null;
  };

  InfCodes.prototype.proc = function(s, z, r) {
    var j; // temporary storage
    var t; // temporary pointer (int[])
    var tindex; // temporary pointer
    var e; // extra bits or operation
    var b = 0; // bit buffer
    var k = 0; // bits in bit buffer
    var p = 0; // input data pointer
    var n; // bytes available there
    var q; // output window write pointer
    var m; // bytes to end of window or read pointer
    var f; // pointer to copy strings from

    // copy input/output information to locals (UPDATE macro restores)
    p = z.next_in_index;
    n = z.avail_in;
    b = s.bitb;
    k = s.bitk;
    q = s.write;
    m = q < s.read ? s.read - q - 1 : s.end - q;

    // process input and output based on current state
    while (true) {
      switch (this.mode) {
        // waiting for "i:"=input, "o:"=output, "x:"=nothing
        case IC_START: // x: set up for LEN
          if (m >= 258 && n >= 10) {
            s.bitb = b;
            s.bitk = k;
            z.avail_in = n;
            z.total_in += p - z.next_in_index;
            z.next_in_index = p;
            s.write = q;
            r = this.inflate_fast(this.lbits, this.dbits, this.ltree, this.ltree_index, this.dtree, this.dtree_index, s, z);
            p = z.next_in_index;
            n = z.avail_in;
            b = s.bitb;
            k = s.bitk;
            q = s.write;
            m = q < s.read ? s.read - q - 1 : s.end - q;

            if (r != Z_OK) {
              this.mode = r == Z_STREAM_END ? IC_WASH : IC_BADCODE;
              break;
            }
          }

          this.need = this.lbits;
          this.tree = this.ltree;
          this.tree_index = this.ltree_index;

          this.mode = IC_LEN;
        case IC_LEN: // i: get length/literal/eob next
          j = this.need;

          while (k < (j)) {
            if (n != 0) {
              r = Z_OK;
            } else {
              s.bitb = b;
              s.bitk = k;
              z.avail_in = n;
              z.total_in += p - z.next_in_index;
              z.next_in_index = p;
              s.write = q;
              return s.inflate_flush(z, r);
            }

            n--;
            b |= (z.next_in[p++] & 0xff) << k;
            k += 8;
          }

          tindex = (this.tree_index + (b & inflate_mask[j])) * 3;

          b >>>= (this.tree[tindex + 1]);
          k -= (this.tree[tindex + 1]);

          e = this.tree[tindex];

          if (e == 0) { // literal
            this.lit = this.tree[tindex + 2];
            this.mode = IC_LIT;
            break;
          }

          if ((e & 16) != 0) { // length
            this.get = e & 15;
            this.len = this.tree[tindex + 2];
            this.mode = IC_LENEXT;
            break;
          }

          if ((e & 64) == 0) { // next table
            this.need = e;
            this.tree_index = tindex / 3 + this.tree[tindex + 2];
            break;
          }

          if ((e & 32) != 0) { // end of block
            this.mode = IC_WASH;
            break;
          }

          this.mode = IC_BADCODE; // invalid code
          z.msg = "invalid literal/length code";
          r = Z_DATA_ERROR;

          s.bitb = b;
          s.bitk = k;
          z.avail_in = n;
          z.total_in += p - z.next_in_index;
          z.next_in_index = p;
          s.write = q;
          return s.inflate_flush(z, r);
        case IC_LENEXT: // i: getting length extra (have base)
          j = this.get;

          while (k < (j)) {
            if (n != 0) {
              r = Z_OK;
            } else {
              s.bitb = b;
              s.bitk = k;
              z.avail_in = n;
              z.total_in += p - z.next_in_index;
              z.next_in_index = p;
              s.write = q;
              return s.inflate_flush(z, r);
            }

            n--;
            b |= (z.next_in[p++] & 0xff) << k;
            k += 8;
          }

          this.len += (b & inflate_mask[j]);

          b >>= j;
          k -= j;

          this.need = this.dbits;
          this.tree = this.dtree;
          this.tree_index = this.dtree_index;
          this.mode = IC_DIST;
        case IC_DIST: // i: get distance next
          j = this.need;

          while (k < (j)) {
            if (n != 0) {
              r = Z_OK;
            } else {
              s.bitb = b;
              s.bitk = k;
              z.avail_in = n;
              z.total_in += p - z.next_in_index;
              z.next_in_index = p;
              s.write = q;
              return s.inflate_flush(z, r);
            }

            n--;
            b |= (z.next_in[p++] & 0xff) << k;
            k += 8;
          }

          tindex = (this.tree_index + (b & inflate_mask[j])) * 3;

          b >>= this.tree[tindex + 1];
          k -= this.tree[tindex + 1];

          e = (this.tree[tindex]);

          if ((e & 16) != 0) { // distance
            this.get = e & 15;
            this.dist = this.tree[tindex + 2];
            this.mode = IC_DISTEXT;
            break;
          }

          if ((e & 64) == 0) { // next table
            this.need = e;
            this.tree_index = tindex / 3 + this.tree[tindex + 2];
            break;
          }

          this.mode = IC_BADCODE; // invalid code
          z.msg = "invalid distance code";
          r = Z_DATA_ERROR;

          s.bitb = b;
          s.bitk = k;
          z.avail_in = n;
          z.total_in += p - z.next_in_index;
          z.next_in_index = p;
          s.write = q;
          return s.inflate_flush(z, r);
        case IC_DISTEXT: // i: getting distance extra
          j = this.get;

          while (k < (j)) {
            if (n != 0) {
              r = Z_OK;
            } else {
              s.bitb = b;
              s.bitk = k;
              z.avail_in = n;
              z.total_in += p - z.next_in_index;
              z.next_in_index = p;
              s.write = q;
              return s.inflate_flush(z, r);
            }

            n--;
            b |= (z.next_in[p++] & 0xff) << k;
            k += 8;
          }

          this.dist += (b & inflate_mask[j]);

          b >>= j;
          k -= j;

          this.mode = IC_COPY;
        case IC_COPY: // o: copying bytes in window, waiting for space
          f = q - this.dist;

          while (f < 0) { // modulo window size-"while" instead
            f += s.end; // of "if" handles invalid distances
          }

          while (this.len != 0) {
            if (m == 0) {
              if (q == s.end && s.read != 0) {
                q = 0;
                m = q < s.read ? s.read - q - 1 : s.end - q;
              }

              if (m == 0) {
                s.write = q;
                r = s.inflate_flush(z, r);
                q = s.write;
                m = q < s.read ? s.read - q - 1 : s.end - q;

                if (q == s.end && s.read != 0) {
                  q = 0;
                  m = q < s.read ? s.read - q - 1 : s.end - q;
                }

                if (m == 0) {
                  s.bitb = b;
                  s.bitk = k;
                  z.avail_in = n;
                  z.total_in += p - z.next_in_index;
                  z.next_in_index = p;
                  s.write = q;
                  return s.inflate_flush(z, r);
                }
              }
            }

            s.window[q++] = s.window[f++];
            m--;

            if (f == s.end) {
              f = 0;
            }

            this.len--;
          }

          this.mode = IC_START;
          break;
        case IC_LIT: // o: got literal, waiting for output space
          if (m == 0) {
            if (q == s.end && s.read != 0) {
              q = 0;
              m = q < s.read ? s.read - q - 1 : s.end - q;
            }

            if (m == 0) {
              s.write = q;
              r = s.inflate_flush(z, r);
              q = s.write;
              m = q < s.read ? s.read - q - 1 : s.end - q;

              if (q == s.end && s.read != 0) {
                q = 0;
                m = q < s.read ? s.read - q - 1 : s.end - q;
              }

              if (m == 0) {
                s.bitb = b;
                s.bitk = k;
                z.avail_in = n;
                z.total_in += p - z.next_in_index;
                z.next_in_index = p;
                s.write = q;
                return s.inflate_flush(z, r);
              }
            }
          }

          r = Z_OK;

          s.window[q++] = this.lit;
          m--;

          this.mode = IC_START;
          break;
        case IC_WASH: // o: got eob, possibly more output
          if (k > 7) { // return unused byte, if any
            k -= 8;
            n++;
            p--; // can always return one
          }

          s.write = q;
          r = s.inflate_flush(z, r);
          q = s.write;
          m = q < s.read ? s.read - q - 1 : s.end - q;

          if (s.read != s.write) {
            s.bitb = b;
            s.bitk = k;
            z.avail_in = n;
            z.total_in += p - z.next_in_index;
            z.next_in_index = p;
            s.write = q;
            return s.inflate_flush(z, r);
          }

          this.mode = IC_END;
        case IC_END:
          r = Z_STREAM_END;
          s.bitb = b;
          s.bitk = k;
          z.avail_in = n;
          z.total_in += p - z.next_in_index;
          z.next_in_index = p;
          s.write = q;
          return s.inflate_flush(z, r);
        case IC_BADCODE: // x: got error

          r = Z_DATA_ERROR;

          s.bitb = b;
          s.bitk = k;
          z.avail_in = n;
          z.total_in += p - z.next_in_index;
          z.next_in_index = p;
          s.write = q;
          return s.inflate_flush(z, r);
        default:
          r = Z_STREAM_ERROR;

          s.bitb = b;
          s.bitk = k;
          z.avail_in = n;
          z.total_in += p - z.next_in_index;
          z.next_in_index = p;
          s.write = q;
          return s.inflate_flush(z, r);
      }
    }
  };

  InfCodes.prototype.free = function(z) {
    //  ZFREE(z, c);
  };

  // Called with number of bytes left to write in window at least 258
  // (the maximum string length) and number of input bytes available
  // at least ten. The ten bytes are six bytes for the longest length/
  // distance pair plus four bytes for overloading the bit buffer.

  InfCodes.prototype.inflate_fast = function(bl, bd, tl, tl_index, td, td_index, s, z) {
    var t; // temporary pointer
    var tp; // temporary pointer (int[])
    var tp_index; // temporary pointer
    var e; // extra bits or operation
    var b; // bit buffer
    var k; // bits in bit buffer
    var p; // input data pointer
    var n; // bytes available there
    var q; // output window write pointer
    var m; // bytes to end of window or read pointer
    var ml; // mask for literal/length tree
    var md; // mask for distance tree
    var c; // bytes to copy
    var d; // distance back to copy from
    var r; // copy source pointer

    var tp_index_t_3; // (tp_index+t)*3

    // load input, output, bit values
    p = z.next_in_index;
    n = z.avail_in;
    b = s.bitb;
    k = s.bitk;
    q = s.write;
    m = q < s.read ? s.read - q - 1 : s.end - q;

    // initialize masks
    ml = inflate_mask[bl];
    md = inflate_mask[bd];

    // do until not enough input or output space for fast loop
    do { // assume called with m >= 258 && n >= 10
      // get literal/length code
      while (k < (20)) { // max bits for literal/length code
        n--;
        b |= (z.next_in[p++] & 0xff) << k;
        k += 8;
      }

      t = b & ml;
      tp = tl;
      tp_index = tl_index;
      tp_index_t_3 = (tp_index + t) * 3;

      if ((e = tp[tp_index_t_3]) == 0) {
        b >>= (tp[tp_index_t_3 + 1]);
        k -= (tp[tp_index_t_3 + 1]);

        s.window[q++] = tp[tp_index_t_3 + 2];
        m--;
        continue;
      }

      do {
        b >>= (tp[tp_index_t_3 + 1]);
        k -= (tp[tp_index_t_3 + 1]);

        if ((e & 16) != 0) {
          e &= 15;
          c = tp[tp_index_t_3 + 2] + (b & inflate_mask[e]);

          b >>= e;
          k -= e;

          // decode distance base of block to copy
          while (k < (15)) { // max bits for distance code
            n--;
            b |= (z.next_in[p++] & 0xff) << k;
            k += 8;
          }

          t = b & md;
          tp = td;
          tp_index = td_index;
          tp_index_t_3 = (tp_index + t) * 3;
          e = tp[tp_index_t_3];

          do {
            b >>= (tp[tp_index_t_3 + 1]);
            k -= (tp[tp_index_t_3 + 1]);

            if ((e & 16) != 0) {
              // get extra bits to add to distance base
              e &= 15;

              while (k < (e)) { // get extra bits (up to 13)
                n--;
                b |= (z.next_in[p++] & 0xff) << k;
                k += 8;
              }

              d = tp[tp_index_t_3 + 2] + (b & inflate_mask[e]);

              b >>= (e);
              k -= (e);

              // do the copy
              m -= c;

              if (q >= d) { // offset before dest
                //  just copy
                r = q - d;

                if (q - r > 0 && 2 > (q - r)) {
                  s.window[q++] = s.window[r++]; // minimum count is three,
                  s.window[q++] = s.window[r++]; // so unroll loop a little
                  c -= 2;
                } else {
                  s.window[q++] = s.window[r++]; // minimum count is three,
                  s.window[q++] = s.window[r++]; // so unroll loop a little
                  c -= 2;
                }
              } else { // else offset after destination
                r = q - d;

                do {
                  r += s.end; // force pointer in window
                } while (r < 0); // covers invalid distances

                e = s.end - r;

                if (c > e) { // if source crosses,
                  c -= e; // wrapped copy

                  if (q - r > 0 && e > (q - r)) {
                    do {
                      s.window[q++] = s.window[r++];
                    } while (--e != 0);
                  } else {
                    arrayCopy(s.window, r, s.window, q, e);
                    q += e;
                    r += e;
                    e = 0;
                  }

                  r = 0; // copy rest from start of window
                }
              }

              // copy all or what's left
              do {
                s.window[q++] = s.window[r++];
              } while (--c != 0);

              break;
            } else if ((e & 64) == 0) {
              t += tp[tp_index_t_3 + 2];
              t += (b & inflate_mask[e]);
              tp_index_t_3 = (tp_index + t) * 3;
              e = tp[tp_index_t_3];
            } else {
              z.msg = "invalid distance code";

              c = z.avail_in - n;
              c = (k >> 3) < c ? k >> 3 : c;
              n += c;
              p -= c;
              k -= c << 3;

              s.bitb = b;
              s.bitk = k;
              z.avail_in = n;
              z.total_in += p - z.next_in_index;
              z.next_in_index = p;
              s.write = q;

              return Z_DATA_ERROR;
            }
          } while (true);

          break;
        }

        if ((e & 64) == 0) {
          t += tp[tp_index_t_3 + 2];
          t += (b & inflate_mask[e]);
          tp_index_t_3 = (tp_index + t) * 3;

          if ((e = tp[tp_index_t_3]) == 0) {
            b >>= (tp[tp_index_t_3 + 1]);
            k -= (tp[tp_index_t_3 + 1]);

            s.window[q++] = tp[tp_index_t_3 + 2];
            m--;
            break;
          }
        } else if ((e & 32) != 0) {
          c = z.avail_in - n;
          c = (k >> 3) < c ? k >> 3 : c;
          n += c;
          p -= c;
          k -= c << 3;

          s.bitb = b;
          s.bitk = k;
          z.avail_in = n;
          z.total_in += p - z.next_in_index;
          z.next_in_index = p;
          s.write = q;

          return Z_STREAM_END;
        } else {
          z.msg = "invalid literal/length code";

          c = z.avail_in - n;
          c = (k >> 3) < c ? k >> 3 : c;
          n += c;
          p -= c;
          k -= c << 3;

          s.bitb = b;
          s.bitk = k;
          z.avail_in = n;
          z.total_in += p - z.next_in_index;
          z.next_in_index = p;
          s.write = q;

          return Z_DATA_ERROR;
        }
      } while (true);
    } while (m >= 258 && n >= 10);

    // not enough input or output--restore pointers and return
    c = z.avail_in - n;
    c = (k >> 3) < c ? k >> 3 : c;
    n += c;
    p -= c;
    k -= c << 3;

    s.bitb = b;
    s.bitk = k;
    z.avail_in = n;
    z.total_in += p - z.next_in_index;
    z.next_in_index = p;
    s.write = q;

    return Z_OK;
  };

  //
  // InfTree.java
  //

  function InfTree() {}

  InfTree.prototype.huft_build = function(b, bindex, n, s, d, e, t, m, hp, hn, v) {
    // Given a list of code lengths and a maximum table size, make a set of
    // tables to decode that set of codes.  Return Z_OK on success, Z_BUF_ERROR
    // if the given code set is incomplete (the tables are still built in this
    // case), Z_DATA_ERROR if the input is invalid (an over-subscribed set of
    // lengths), or Z_MEM_ERROR if not enough memory.

    var a; // counter for codes of length k
    var f; // i repeats in table every f entries
    var g; // maximum code length
    var h; // table level
    var i; // counter, current code
    var j; // counter
    var k; // number of bits in current code
    var l; // bits per table (returned in m)
    var mask; // (1 << w) - 1, to avoid cc -O bug on HP
    var p; // pointer into c[], b[], or v[]
    var q; // points to current table
    var w; // bits before this table == (l * h)
    var xp; // pointer into x
    var y; // number of dummy codes added
    var z; // number of entries in current table

    // Generate counts for each bit length

    p = 0;
    i = n;

    do {
      this.c[b[bindex + p]]++;
      p++;
      i--; // assume all entries <= BMAX
    } while (i != 0);

    if (this.c[0] == n) { // null input--all zero length codes
      t[0] = -1;
      m[0] = 0;
      return Z_OK;
    }

    // Find minimum and maximum length, bound *m by those
    l = m[0];

    for (j = 1; j <= BMAX; j++) {
      if (this.c[j] != 0) {
        break;
      }
    }

    k = j; // minimum code length

    if (l < j) {
      l = j;
    }

    for (i = BMAX; i != 0; i--) {
      if (this.c[i] != 0) {
        break;
      }
    }

    g = i; // maximum code length

    if (l > i) {
      l = i;
    }

    m[0] = l;

    // Adjust last length count to fill out codes, if needed
    for (y = 1 << j; j < i; j++, y <<= 1) {
      if ((y -= this.c[j]) < 0) {
        return Z_DATA_ERROR;
      }
    }

    if ((y -= this.c[i]) < 0) {
      return Z_DATA_ERROR;
    }

    this.c[i] += y;

    // Generate starting offsets into the value table for each length
    this.x[1] = j = 0;
    p = 1;
    xp = 2;

    while (--i != 0) { // note that i == g from above
      this.x[xp] = (j += this.c[p]);
      xp++;
      p++;
    }

    // Make a table of values in order of bit lengths
    i = 0;
    p = 0;

    do {
      if ((j = b[bindex + p]) != 0) {
        this.v[this.x[j]++] = i;
      }
      p++;
    } while (++i < n);

    n = this.x[g]; // set n to length of v

    // Generate the Huffman codes and for each, make the table entries
    this.x[0] = i = 0; // first Huffman code is zero
    p = 0; // grab values in bit order
    h = -1; // no tables yet--level -1
    w = -l; // bits decoded == (l * h)
    this.u[0] = 0; // just to keep compilers happy
    q = 0; // ditto
    z = 0; // ditto

    // go through the bit lengths (k already is bits in shortest code)
    for (; k <= g; k++) {
      a = this.c[k];

      while (a-- != 0) {
        // here i is the Huffman code of length k bits for value *p
        // make tables up to required level
        while (k > w + l) {
          h++;
          w += l; // previous table always l bits
          // compute minimum size table less than or equal to l bits
          z = g - w;
          z = (z > l) ? l : z; // table size upper limit

          if ((f = 1 << (j = k - w)) > a + 1) { // try a k-w bit table
            // too few codes for k-w bit table
            f -= a + 1; // deduct codes from patterns left
            xp = k;

            if (j < z) {
              while (++j < z) { // try smaller tables up to z bits
                if ((f <<= 1) <= this.c[++xp]) {
                  break; // enough codes to use up j bits
                }

                f -= this.c[xp]; // else deduct codes from patterns
              }
            }
          }

          z = 1 << j; // table entries for j-bit table

          // allocate new table
          if (this.hn[0] + z > MANY) { // (note: doesn't matter for fixed)
            return Z_DATA_ERROR; // overflow of MANY
          }

          this.u[h] = q = /*hp+*/ this.hn[0]; // DEBUG
          this.hn[0] += z;

          // connect to last table, if there is one
          if (h != 0) {
            this.x[h] = i; // save pattern for backing up
            this.r[0] = j; // bits in this table
            this.r[1] = l; // bits to dump before this table
            j = i >>> (w - l);
            this.r[2] = (q - this.u[h - 1] - j); // offset to this table
            arrayCopy(this.r, 0, hp, (this.u[h - 1] + j) * 3, 3); // connect to last table
          } else {
            t[0] = q; // first table is returned result
          }
        }

        // set up table entry in r
        this.r[1] = (k - w);

        if (p >= n) {
          this.r[0] = 128 + 64; // out of values--invalid code
        } else if (v[p] < s) {
          this.r[0] = (this.v[p] < 256 ? 0 : 32 + 64); // 256 is end-of-block
          this.r[2] = this.v[p++]; // simple code is just the value
        } else {
          this.r[0] = (e[this.v[p] - s] + 16 + 64); // non-simple--look up in lists
          this.r[2] = d[this.v[p++] - s];
        }

        // fill code-like entries with r
        f = 1 << (k - w);

        for (j = i >>> w; j < z; j += f) {
          arrayCopy(this.r, 0, hp, (q + j) * 3, 3);
        }

        // backwards increment the k-bit code i
        for (j = 1 << (k - 1); (i & j) != 0; j >>>= 1) {
          i ^= j;
        }

        i ^= j;

        // backup over finished tables
        mask = (1 << w) - 1; // needed on HP, cc -O bug

        while ((i & mask) != this.x[h]) {
          h--; // don't need to update q
          w -= l;
          mask = (1 << w) - 1;
        }
      }
    }

    // Return Z_BUF_ERROR if we were given an incomplete table
    return y != 0 && g != 1 ? Z_BUF_ERROR : Z_OK;
  };

  InfTree.prototype.inflate_trees_bits = function(c, bb, tb, hp, z) {
    var result;
    this.initWorkArea(19);
    this.hn[0] = 0;
    result = this.huft_build(c, 0, 19, 19, null, null, tb, bb, hp, this.hn, this.v);

    if (result == Z_DATA_ERROR) {
      z.msg = "oversubscribed dynamic bit lengths tree";
    } else if (result == Z_BUF_ERROR || bb[0] == 0) {
      z.msg = "incomplete dynamic bit lengths tree";
      result = Z_DATA_ERROR;
    }

    return result;
  };

  InfTree.prototype.inflate_trees_dynamic = function(nl, nd, c, bl, bd, tl, td, hp, z) {
    var result;

    // build literal/length tree
    this.initWorkArea(288);
    this.hn[0] = 0;
    result = this.huft_build(c, 0, nl, 257, cplens, cplext, tl, bl, hp, this.hn, this.v);

    if (result != Z_OK || bl[0] == 0) {
      if (result == Z_DATA_ERROR) {
        z.msg = "oversubscribed literal/length tree";
      } else if (result != Z_MEM_ERROR) {
        z.msg = "incomplete literal/length tree";
        result = Z_DATA_ERROR;
      }

      return result;
    }

    // build distance tree
    this.initWorkArea(288);
    result = this.huft_build(c, nl, nd, 0, cpdist, cpdext, td, bd, hp, this.hn, this.v);

    if (result != Z_OK || (bd[0] == 0 && nl > 257)) {
      if (result == Z_DATA_ERROR) {
        z.msg = "oversubscribed distance tree";
      } else if (result == Z_BUF_ERROR) {
        z.msg = "incomplete distance tree";
        result = Z_DATA_ERROR;
      } else if (result != Z_MEM_ERROR) {
        z.msg = "empty distance tree with lengths";
        result = Z_DATA_ERROR;
      }

      return result;
    }

    return Z_OK;
  };

  /*
    static int inflate_trees_fixed(int[] bl,  //literal desired/actual bit depth
                                   int[] bd,  //distance desired/actual bit depth
                                   int[][] tl,//literal/length tree result
                                   int[][] td,//distance tree result
                                   ZStream z  //for memory allocation
    ){

  */

  function inflate_trees_fixed(bl, bd, tl, td, z) {
    bl[0] = fixed_bl;
    bd[0] = fixed_bd;
    tl[0] = fixed_tl;
    td[0] = fixed_td;
    return Z_OK;
  }

  InfTree.prototype.initWorkArea = function(vsize) {
    if (this.hn == null) {
      this.hn = new Int32Array(1);
      this.v = new Int32Array(vsize);
      this.c = new Int32Array(BMAX + 1);
      this.r = new Int32Array(3);
      this.u = new Int32Array(BMAX);
      this.x = new Int32Array(BMAX + 1);
    }

    if (this.v.length < vsize) {
      this.v = new Int32Array(vsize);
    }

    for (var i = 0; i < vsize; i++) {
      this.v[i] = 0;
    }

    for (var i = 0; i < BMAX + 1; i++) {
      this.c[i] = 0;
    }

    for (var i = 0; i < 3; i++) {
      this.r[i] = 0;
    }

    //  for(int i=0; i<BMAX; i++){u[i]=0;}
    arrayCopy(this.c, 0, this.u, 0, BMAX);
    //  for(int i=0; i<BMAX+1; i++){x[i]=0;}
    arrayCopy(this.c, 0, this.x, 0, BMAX + 1);
  };

  var testArray = new Uint8Array(1);
  var hasSubarray = (typeof testArray.subarray === 'function');
  var hasSlice = false; /* (typeof testArray.slice === 'function'); */ // Chrome slice performance is so dire that we're currently not using it...

  function arrayCopy(src, srcOffset, dest, destOffset, count) {
    if (count == 0) {
      return;
    }

    if (!src) {
      throw "Undef src";
    } else if (!dest) {
      throw "Undef dest";
    }

    if (srcOffset == 0 && count == src.length) {
      arrayCopy_fast(src, dest, destOffset);
    } else if (hasSubarray) {
      arrayCopy_fast(src.subarray(srcOffset, srcOffset + count), dest, destOffset);
    } else if (src.BYTES_PER_ELEMENT == 1 && count > 100) {
      arrayCopy_fast(new Uint8Array(src.buffer, src.byteOffset + srcOffset, count), dest, destOffset);
    } else {
      arrayCopy_slow(src, srcOffset, dest, destOffset, count);
    }
  }

  function arrayCopy_slow(src, srcOffset, dest, destOffset, count) {
    // dlog('_slow call: srcOffset=' + srcOffset + '; destOffset=' + destOffset + '; count=' + count);
    for (var i = 0; i < count; ++i) {
      dest[destOffset + i] = src[srcOffset + i];
    }
  }

  function arrayCopy_fast(src, dest, destOffset) {
    dest.set(src, destOffset);
  }

  // largest prime smaller than 65536
  var ADLER_BASE = 65521;
  // NMAX is the largest n such that 255n(n+1)/2 + (n+1)(BASE-1) <= 2^32-1
  var ADLER_NMAX = 5552;

  function adler32(adler, /* byte[] */ buf, index, len) {
    if (buf == null) {
      return 1;
    }

    var s1 = adler & 0xffff;
    var s2 = (adler >> 16) & 0xffff;
    var k;

    while (len > 0) {
      k = len < ADLER_NMAX ? len : ADLER_NMAX;
      len -= k;

      while (k >= 16) {
        s1 += buf[index++] & 0xff;
        s2 += s1;
        s1 += buf[index++] & 0xff;
        s2 += s1;
        s1 += buf[index++] & 0xff;
        s2 += s1;
        s1 += buf[index++] & 0xff;
        s2 += s1;
        s1 += buf[index++] & 0xff;
        s2 += s1;
        s1 += buf[index++] & 0xff;
        s2 += s1;
        s1 += buf[index++] & 0xff;
        s2 += s1;
        s1 += buf[index++] & 0xff;
        s2 += s1;
        s1 += buf[index++] & 0xff;
        s2 += s1;
        s1 += buf[index++] & 0xff;
        s2 += s1;
        s1 += buf[index++] & 0xff;
        s2 += s1;
        s1 += buf[index++] & 0xff;
        s2 += s1;
        s1 += buf[index++] & 0xff;
        s2 += s1;
        s1 += buf[index++] & 0xff;
        s2 += s1;
        s1 += buf[index++] & 0xff;
        s2 += s1;
        s1 += buf[index++] & 0xff;
        s2 += s1;
        k -= 16;
      }

      if (k != 0) {
        do {
          s1 += buf[index++] & 0xff;
          s2 += s1;
        } while (--k != 0);
      }

      s1 %= ADLER_BASE;
      s2 %= ADLER_BASE;
    }

    return (s2 << 16) | s1;
  }

  function inflateBuffer(buffer, start, length, afterUncOffset) {
    if (!start) {
      buffer = new Uint8Array(buffer);
    } else if (!length) {
      buffer = new Uint8Array(buffer, start, buffer.byteLength - start);
    } else {
      buffer = new Uint8Array(buffer, start, length);
    }

    var z = new ZStream();
    z.inflateInit(DEF_WBITS, true);
    z.next_in = buffer;
    z.next_in_index = 0;
    z.avail_in = buffer.length;

    var oBlockList = [];
    var totalSize = 0;

    while (true) {
      var obuf = new Uint8Array(32000);
      z.next_out = obuf;
      z.next_out_index = 0;
      z.avail_out = obuf.length;
      var status = z.inflate(Z_NO_FLUSH);

      if (status != Z_OK && status != Z_STREAM_END && status != Z_BUF_ERROR) {
        throw z.msg;
      }

      if (z.avail_out != 0) {
        var newob = new Uint8Array(obuf.length - z.avail_out);
        arrayCopy(obuf, 0, newob, 0, (obuf.length - z.avail_out));
        obuf = newob;
      }

      oBlockList.push(obuf);
      totalSize += obuf.length;

      if (status == Z_STREAM_END || status == Z_BUF_ERROR) {
        break;
      }
    }

    if (afterUncOffset) {
      afterUncOffset[0] = (start || 0) + z.next_in_index;
    }

    if (oBlockList.length == 1) {
      return oBlockList[0].buffer;
    } else {
      var out = new Uint8Array(totalSize);
      var cursor = 0;

      for (var i = 0; i < oBlockList.length; ++i) {
        var b = oBlockList[i];
        arrayCopy(b, 0, out, cursor, b.length);
        cursor += b.length;
      }

      return out.buffer;
    }
  }

  /*-------------------------------------------------------------------------------------------------------------------------------*/

  /*
   * A JavaScript implementation of the Secure Hash Algorithm, SHA-1, as defined
   * in FIPS 180-1
   * Version 2.2 Copyright Paul Johnston 2000 - 2009.
   * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
   * Distributed under the BSD License
   * See http://pajhome.org.uk/crypt/md5 for details.
   */

  /*
   * Configurable variables. You may need to tweak these to be compatible with
   * the server-side, but the defaults work in most cases.
   */
  var hexcase = 0; /* hex output format. 0 - lowercase; 1 - uppercase        */
  var b64pad = ""; /* base-64 pad character. "=" for strict RFC compliance   */

  /*
   * These are the functions you'll usually want to call
   * They take string arguments and return either hex or base-64 encoded strings
   */
  function hex_sha1(s) {
    return rstr2hex(rstr_sha1(str2rstr_utf8(s)));
  }

  function b64_sha1(s) {
    return rstr2b64(rstr_sha1(str2rstr_utf8(s)));
  }

  function any_sha1(s, e) {
    return rstr2any(rstr_sha1(str2rstr_utf8(s)), e);
  }

  function hex_hmac_sha1(k, d) {
    return rstr2hex(rstr_hmac_sha1(str2rstr_utf8(k), str2rstr_utf8(d)));
  }

  function b64_hmac_sha1(k, d) {
    return rstr2b64(rstr_hmac_sha1(str2rstr_utf8(k), str2rstr_utf8(d)));
  }

  function any_hmac_sha1(k, d, e) {
    return rstr2any(rstr_hmac_sha1(str2rstr_utf8(k), str2rstr_utf8(d)), e);
  }

  /*
   * Perform a simple self-test to see if the VM is working
   */
  function sha1_vm_test() {
    return hex_sha1("abc").toLowerCase() == "a9993e364706816aba3e25717850c26c9cd0d89d";
  }

  /*
   * Calculate the SHA1 of a raw string
   */
  function rstr_sha1(s) {
    return binb2rstr(binb_sha1(rstr2binb(s), s.length * 8));
  }

  /*
   * Calculate the HMAC-SHA1 of a key and some data (raw strings)
   */
  function rstr_hmac_sha1(key, data) {
    var bkey = rstr2binb(key);

    if (bkey.length > 16) {
      bkey = binb_sha1(bkey, key.length * 8);
    }

    var ipad = Array(16), opad = Array(16);

    for (var i = 0; i < 16; i++) {
      ipad[i] = bkey[i] ^ 0x36363636;
      opad[i] = bkey[i] ^ 0x5C5C5C5C;
    }

    var hash = binb_sha1(ipad.concat(rstr2binb(data)), 512 + data.length * 8);
    return binb2rstr(binb_sha1(opad.concat(hash), 512 + 160));
  }

  /*
   * Convert a raw string to a hex string
   */
  function rstr2hex(input) {
    // try { hexcase } catch(e) { hexcase=0; }
    var hex_tab = hexcase ? "0123456789ABCDEF" : "0123456789abcdef";
    var output = "";
    var x;

    for (var i = 0; i < input.length; i++) {
      x = input.charCodeAt(i);
      output += hex_tab.charAt((x >>> 4) & 0x0F) + hex_tab.charAt(x & 0x0F);
    }

    return output;
  }

  /*
   * Convert a raw string to a base-64 string
   */
  function rstr2b64(input) {
    // try { b64pad } catch(e) { b64pad=''; }
    var tab = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    var output = "";
    var len = input.length;

    for (var i = 0; i < len; i += 3) {
      var triplet = (input.charCodeAt(i) << 16) | (i + 1 < len ? input.charCodeAt(i + 1) << 8 : 0) | (i + 2 < len ? input.charCodeAt(i + 2) : 0);

      for (var j = 0; j < 4; j++) {
        if (i * 8 + j * 6 > input.length * 8) {
          output += b64pad;
        } else {
          output += tab.charAt((triplet >>> 6 * (3 - j)) & 0x3F);
        }
      }
    }

    return output;
  }

  /*
   * Convert a raw string to an arbitrary string encoding
   */
  function rstr2any(input, encoding) {
    var divisor = encoding.length;
    var remainders = Array();
    var i, q, x, quotient;

    /* Convert to an array of 16-bit big-endian values, forming the dividend */
    var dividend = Array(Math.ceil(input.length / 2));

    for (i = 0; i < dividend.length; i++) {
      dividend[i] = (input.charCodeAt(i * 2) << 8) | input.charCodeAt(i * 2 + 1);
    }

    /*
     * Repeatedly perform a long division. The binary array forms the dividend,
     * the length of the encoding is the divisor. Once computed, the quotient
     * forms the dividend for the next step. We stop when the dividend is zero.
     * All remainders are stored for later use.
     */
    while (dividend.length > 0) {
      quotient = Array();
      x = 0;

      for (i = 0; i < dividend.length; i++) {
        x = (x << 16) + dividend[i];
        q = Math.floor(x / divisor);
        x -= q * divisor;

        if (quotient.length > 0 || q > 0) {
          quotient[quotient.length] = q;
        }
      }

      remainders[remainders.length] = x;
      dividend = quotient;
    }

    /* Convert the remainders to the output string */
    var output = "";

    for (i = remainders.length - 1; i >= 0; i--) {
      output += encoding.charAt(remainders[i]);
    }

    /* Append leading zero equivalents */
    var full_length = Math.ceil(input.length * 8 / (Math.log(encoding.length) / Math.log(2)));

    for (i = output.length; i < full_length; i++) {
      output = encoding[0] + output;
    }

    return output;
  }

  /*
   * Encode a string as utf-8.
   * For efficiency, this assumes the input is valid utf-16.
   */
  function str2rstr_utf8(input) {
    var output = "";
    var i = -1;
    var x, y;

    while (++i < input.length) {
      /* Decode utf-16 surrogate pairs */
      x = input.charCodeAt(i);
      y = i + 1 < input.length ? input.charCodeAt(i + 1) : 0;

      if (0xD800 <= x && x <= 0xDBFF && 0xDC00 <= y && y <= 0xDFFF) {
        x = 0x10000 + ((x & 0x03FF) << 10) + (y & 0x03FF);
        i++;
      }

      /* Encode output as utf-8 */
      if (x <= 0x7F) {
        output += String.fromCharCode(x);
      } else if (x <= 0x7FF) {
        output += String.fromCharCode(0xC0 | ((x >>> 6) & 0x1F), 0x80 | (x & 0x3F));
      } else if (x <= 0xFFFF) {
        output += String.fromCharCode(0xE0 | ((x >>> 12) & 0x0F), 0x80 | ((x >>> 6) & 0x3F), 0x80 | (x & 0x3F));
      } else if (x <= 0x1FFFFF) {
        output += String.fromCharCode(0xF0 | ((x >>> 18) & 0x07), 0x80 | ((x >>> 12) & 0x3F), 0x80 | ((x >>> 6) & 0x3F), 0x80 | (x & 0x3F));
      }
    }

    return output;
  }

  /*
   * Encode a string as utf-16
   */
  function str2rstr_utf16le(input) {
    var output = "";

    for (var i = 0; i < input.length; i++) {
      output += String.fromCharCode(input.charCodeAt(i) & 0xFF, (input.charCodeAt(i) >>> 8) & 0xFF);
    }

    return output;
  }

  function str2rstr_utf16be(input) {
    var output = "";

    for (var i = 0; i < input.length; i++) {
      output += String.fromCharCode((input.charCodeAt(i) >>> 8) & 0xFF, input.charCodeAt(i) & 0xFF);
    }

    return output;
  }

  /*
   * Convert a raw string to an array of big-endian words
   * Characters >255 have their high-byte silently ignored.
   */
  function rstr2binb(input) {
    var output = Array(input.length >> 2);

    for (var i = 0; i < output.length; i++) {
      output[i] = 0;
    }

    for (var i = 0; i < input.length * 8; i += 8) {
      output[i >> 5] |= (input.charCodeAt(i / 8) & 0xFF) << (24 - i % 32);
    }

    return output;
  }

  /*
   * Convert an array of big-endian words to a string
   */
  function binb2rstr(input) {
    var output = "";

    for (var i = 0; i < input.length * 32; i += 8) {
      output += String.fromCharCode((input[i >> 5] >>> (24 - i % 32)) & 0xFF);
    }

    return output;
  }

  /*
   * Calculate the SHA-1 of an array of big-endian words, and a bit length
   */
  function binb_sha1(x, len) {
    /* append padding */
    x[len >> 5] |= 0x80 << (24 - len % 32);
    x[((len + 64 >> 9) << 4) + 15] = len;

    var w = Array(80);
    var a = 1732584193;
    var b = -271733879;
    var c = -1732584194;
    var d = 271733878;
    var e = -1009589776;

    for (var i = 0; i < x.length; i += 16) {
      var olda = a;
      var oldb = b;
      var oldc = c;
      var oldd = d;
      var olde = e;

      for (var j = 0; j < 80; j++) {
        if (j < 16) {
          w[j] = x[i + j];
        } else {
          w[j] = bit_rol(w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16], 1);
        }

        var t = safe_add(safe_add(bit_rol(a, 5), sha1_ft(j, b, c, d)), safe_add(safe_add(e, w[j]), sha1_kt(j)));
        e = d;
        d = c;
        c = bit_rol(b, 30);
        b = a;
        a = t;
      }

      a = safe_add(a, olda);
      b = safe_add(b, oldb);
      c = safe_add(c, oldc);
      d = safe_add(d, oldd);
      e = safe_add(e, olde);
    }

    return Array(a, b, c, d, e);
  }

  /*
   * Perform the appropriate triplet combination function for the current
   * iteration
   */
  function sha1_ft(t, b, c, d) {
    if (t < 20) {
      return (b & c) | ((~b) & d);
    }

    if (t < 40) {
      return b ^ c ^ d;
    }

    if (t < 60) {
      return (b & c) | (b & d) | (c & d);
    }

    return b ^ c ^ d;
  }

  /*
   * Determine the appropriate additive constant for the current iteration
   */
  function sha1_kt(t) {
    return (t < 20) ? 1518500249 : (t < 40) ? 1859775393 : (t < 60) ? -1894007588 : -899497514;
  }

  /*
   * Add integers, wrapping at 2^32. This uses 16-bit operations internally
   * to work around bugs in some JS interpreters.
   */
  function safe_add(x, y) {
    var lsw = (x & 0xFFFF) + (y & 0xFFFF);
    var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
    return (msw << 16) | (lsw & 0xFFFF);
  }

  /*
   * Bitwise rotate a 32-bit number to the left.
   */
  function bit_rol(num, cnt) {
    return (num << cnt) | (num >>> (32 - cnt));
  }

  /*-------------------------------------------------------------------------------------------------------------------------------*/

  //
  // Dalliance Genome Explorer
  // (c) Thomas Down 2006-2011
  //
  // js: common support for lh3's file formats
  //

  function Vob(b, o) {
    this.block = b;
    this.offset = o;
  }

  Vob.prototype.toString = function() {
    return '' + this.block + ':' + this.offset;
  };

  function readVob(ba, offset, allowZero) {
    var block = ((ba[offset + 6] & 0xff) * 0x100000000) + ((ba[offset + 5] & 0xff) * 0x1000000) + ((ba[offset + 4] & 0xff) * 0x10000) + ((ba[offset + 3] & 0xff) * 0x100) + ((ba[offset + 2] & 0xff));
    var bint = (ba[offset + 1] << 8) | (ba[offset]);

    if (block == 0 && bint == 0 && !allowZero) {
      return null; // Should only happen in the linear index?
    } else {
      return new Vob(block, bint);
    }
  }

  function unbgzf(data, lim) {
    lim = Math.min(lim || 1, data.byteLength - 50);
    var oBlockList = [];
    var ptr = [0];
    var totalSize = 0;

    while (ptr[0] < lim) {
      var ba = new Uint8Array(data, ptr[0], 12); // FIXME is this enough for all credible BGZF block headers?
      var xlen = (ba[11] << 8) | (ba[10]);
      // dlog('xlen[' + (ptr[0]) +']=' + xlen);
      var unc = inflateBuffer(data, 12 + xlen + ptr[0], Math.min(65536, data.byteLength - 12 - xlen - ptr[0]), ptr);
      ptr[0] += 8;
      totalSize += unc.byteLength;
      oBlockList.push(unc);
    }

    if (oBlockList.length == 1) {
      return oBlockList[0];
    } else {
      var out = new Uint8Array(totalSize);
      var cursor = 0;

      for (var i = 0; i < oBlockList.length; ++i) {
        var b = new Uint8Array(oBlockList[i]);
        arrayCopy(b, 0, out, cursor, b.length);
        cursor += b.length;
      }

      return out.buffer;
    }
  }

  function Chunk(minv, maxv) {
    this.minv = minv;
    this.maxv = maxv;
  }


  //
  // Binning (transliterated from SAM1.3 spec)
  //

  /* calculate bin given an alignment covering [beg,end) (zero-based, half-close-half-open) */
  function reg2bin(beg, end) {
    --end;

    if (beg >> 14 == end >> 14) {
      return ((1 << 15) - 1) / 7 + (beg >> 14);
    }

    if (beg >> 17 == end >> 17) {
      return ((1 << 12) - 1) / 7 + (beg >> 17);
    }

    if (beg >> 20 == end >> 20) {
      return ((1 << 9) - 1) / 7 + (beg >> 20);
    }

    if (beg >> 23 == end >> 23) {
      return ((1 << 6) - 1) / 7 + (beg >> 23);
    }

    if (beg >> 26 == end >> 26) {
      return ((1 << 3) - 1) / 7 + (beg >> 26);
    }

    return 0;
  }

  /* calculate the list of bins that may overlap with region [beg,end) (zero-based) */
  var MAX_BIN = (((1 << 18) - 1) / 7);

  function reg2bins(beg, end) {
    var i = 0, k, list = [];
    --end;
    list.push(0);

    for (k = 1 + (beg >> 26); k <= 1 + (end >> 26); ++k) {
      list.push(k);
    }

    for (k = 9 + (beg >> 23); k <= 9 + (end >> 23); ++k) {
      list.push(k);
    }

    for (k = 73 + (beg >> 20); k <= 73 + (end >> 20); ++k) {
      list.push(k);
    }

    for (k = 585 + (beg >> 17); k <= 585 + (end >> 17); ++k) {
      list.push(k);
    }

    for (k = 4681 + (beg >> 14); k <= 4681 + (end >> 14); ++k) {
      list.push(k);
    }

    return list;
  }

  /*-------------------------------------------------------------------------------------------------------------------------------*/

  //
  // Dalliance Genome Explorer
  // (c) Thomas Down 2006-2011
  //
  // bin.js general binary data support
  //

  function shallowCopy(o) {
    var n = {};

    for (var k in o) {
      n[k] = o[k];
    }

    return n;
  }

  function BlobFetchable(b) {
    this.blob = b;
  }

  BlobFetchable.prototype.slice = function(start, length) {
    var b;

    if (this.blob.slice) {
      if (length) {
        b = this.blob.slice(start, start + length);
      } else {
        b = this.blob.slice(start);
      }
    } else {
      if (length) {
        b = this.blob.webkitSlice(start, start + length);
      } else {
        b = this.blob.webkitSlice(start);
      }
    }

    return new BlobFetchable(b);
  };

  BlobFetchable.prototype.salted = function() {
    return this;
  };

  if (typeof(FileReader) !== 'undefined') {
    // console.log('defining async BlobFetchable.fetch');

    BlobFetchable.prototype.fetch = function(callback) {
      var reader = new FileReader();

      reader.onloadend = function(ev) {
        callback(bstringToBuffer(reader.result));
      };

      reader.readAsBinaryString(this.blob);
    };
  } else {
    // if (console && console.log)
    //    console.log('defining sync BlobFetchable.fetch');

    BlobFetchable.prototype.fetch = function(callback) {
      var reader = new FileReaderSync();

      try {
        var res = reader.readAsArrayBuffer(this.blob);
        callback(res);
      } catch (e) {
        callback(null, e);
      }
    };
  }

  function URLFetchable(url, start, end, opts) {
    if (!opts) {
      if (typeof start === 'object') {
        opts = start;
        start = undefined;
      } else {
        opts = {};
      }
    }

    this.url = url;
    this.start = start || 0;

    if (end) {
      this.end = end;
    }

    this.opts = opts;
  }

  URLFetchable.prototype.slice = function(s, l) {
    if (s < 0) {
      throw 'Bad slice ' + s;
    }

    var ns = this.start, ne = this.end;

    if (ns && s) {
      ns = ns + s;
    } else {
      ns = s || ns;
    }

    if (l && ns) {
      ne = ns + l - 1;
    } else {
      ne = ne || l - 1;
    }

    return new URLFetchable(this.url, ns, ne, this.opts);
  };

  var seed = 0;
  var isSafari = navigator.userAgent.indexOf('Safari') >= 0 && navigator.userAgent.indexOf('Chrome') < 0;

  URLFetchable.prototype.fetchAsText = function(callback) {
    var thisB = this;

    this.getURL().then(function(url) {
      try {
        var req = new XMLHttpRequest();
        var length;

        if ((isSafari || thisB.opts.salt) && url.indexOf('?') < 0) {
          url = url + '?salt=' + b64_sha1('' + Date.now() + ',' + (++seed));
        }

        req.open('GET', url, true);

        if (thisB.end) {
          if (thisB.end - thisB.start > 100000000) {
            throw 'Monster fetch!';
          }

          req.setRequestHeader('Range', 'bytes=' + thisB.start + '-' + thisB.end);
          length = thisB.end - thisB.start + 1;
        }

        req.onreadystatechange = function() {
          if (req.readyState == 4) {
            if (req.status == 200 || req.status == 206) {
              return callback(req.responseText);
            } else {
              return callback(null);
            }
          }
        };

        if (thisB.opts.credentials) {
          req.withCredentials = true;
        }

        req.send('');
      } catch (e) {
        return callback(null);
      }
    }).fail(function(err) {
      console.log(err);
      return callback(null, err);
    });
  };

  URLFetchable.prototype.salted = function() {
    var o = shallowCopy(this.opts);
    o.salt = true;
    return new URLFetchable(this.url, this.start, this.end, o);
  };

  URLFetchable.prototype.getURL = function() {
    if (this.opts.resolver) {
      return this.opts.resolver(this.url).then(function(urlOrObj) {
        if (typeof urlOrObj === 'string') {
          return urlOrObj;
        } else {
          return urlOrObj.url;
        }
      });
    } else {
      return $.Deferred().resolve(this.url);
    }
  };

  URLFetchable.prototype.fetch = function(callback, opts) {
    var thisB = this;

    opts = opts || {};
    var attempt = opts.attempt || 1;
    var truncatedLength = opts.truncatedLength;

    if (attempt > 3) {
      return callback(null);
    }

    this.getURL().then(function(url) {
      try {
        var timeout;

        if (opts.timeout && !thisB.opts.credentials) {
          timeout = setTimeout(
            function() {
              console.log('timing out ' + url);
              req.abort();
              return callback(null, 'Timeout');
            },
            opts.timeout
          );
        }

        var req = new XMLHttpRequest();
        var length;

        if ((isSafari || thisB.opts.salt) && url.indexOf('?') < 0) {
          url = url + '?salt=' + b64_sha1('' + Date.now() + ',' + (++seed));
        }

        req.open('GET', url, true);
        req.overrideMimeType('text/plain; charset=x-user-defined');

        if (thisB.end) {
          if (thisB.end - thisB.start > 100000000) {
            throw 'Monster fetch!';
          }

          req.setRequestHeader('Range', 'bytes=' + thisB.start + '-' + thisB.end);
          length = thisB.end - thisB.start + 1;
        }

        req.responseType = 'arraybuffer';
        req.onreadystatechange = function() {
          if (req.readyState == 4) {
            if (timeout) {
              clearTimeout(timeout);
            }

            if (req.status == 200 || req.status == 206) {
              if (req.response) {
                var bl = req.response.byteLength;

                if (length && length != bl && (!truncatedLength || bl != truncatedLength)) {
                  return thisB.fetch(callback, {
                    attempt: attempt + 1,
                    truncatedLength: bl
                  });
                } else {
                  return callback(req.response);
                }
              } else if (req.mozResponseArrayBuffer) {
                return callback(req.mozResponseArrayBuffer);
              } else {
                var r = req.responseText;

                if (length && length != r.length && (!truncatedLength || r.length != truncatedLength)) {
                  return thisB.fetch(callback, {
                    attempt: attempt + 1,
                    truncatedLength: r.length
                  });
                } else {
                  return callback(bstringToBuffer(req.responseText));
                }
              }
            } else {
              return thisB.fetch(callback, {
                attempt: attempt + 1
              });
            }
          }
        };

        if (thisB.opts.credentials) {
          req.withCredentials = true;
        }
        req.send('');
      } catch (e) {
        return callback(null);
      }
    }).fail(function(err) {
      console.log(err);
      return callback(null, err);
    });
  };

  function bstringToBuffer(result) {
    if (!result) {
      return null;
    }

    var ba = new Uint8Array(result.length);

    for (var i = 0; i < ba.length; ++i) {
      ba[i] = result.charCodeAt(i);
    }

    return ba.buffer;
  }

  // Read from Uint8Array
  function readFloat(buf, offset) {
    var convertBuffer = new ArrayBuffer(8);
    var ba = new Uint8Array(convertBuffer);
    var fa = new Float32Array(convertBuffer);

    ba[0] = buf[offset];
    ba[1] = buf[offset + 1];
    ba[2] = buf[offset + 2];
    ba[3] = buf[offset + 3];

    return fa[0];
  }

  function readInt64(ba, offset) {
    return (ba[offset + 7] << 24) | (ba[offset + 6] << 16) | (ba[offset + 5] << 8) | (ba[offset + 4]);
  }

  function readInt(ba, offset) {
    return (ba[offset + 3] << 24) | (ba[offset + 2] << 16) | (ba[offset + 1] << 8) | (ba[offset]);
  }

  function readShort(ba, offset) {
    return (ba[offset + 1] << 8) | (ba[offset]);
  }

  function readByte(ba, offset) {
    return ba[offset];
  }

  function readIntBE(ba, offset) {
    return (ba[offset] << 24) | (ba[offset + 1] << 16) | (ba[offset + 2] << 8) | (ba[offset + 3]);
  }

  /*-------------------------------------------------------------------------------------------------------------------------------*/

  //
  // Dalliance Genome Explorer
  // (c) Thomas Down 2006-2011
  //
  // bam.js: indexed binary alignments
  //

  var BAM_MAGIC = 0x14d4142;
  var BAI_MAGIC = 0x1494142;

  var BamFlags = {
    MULTIPLE_SEGMENTS: 0x1,
    ALL_SEGMENTS_ALIGN: 0x2,
    SEGMENT_UNMAPPED: 0x4,
    NEXT_SEGMENT_UNMAPPED: 0x8,
    REVERSE_COMPLEMENT: 0x10,
    NEXT_REVERSE_COMPLEMENT: 0x20,
    FIRST_SEGMENT: 0x40,
    LAST_SEGMENT: 0x80,
    SECONDARY_ALIGNMENT: 0x100,
    QC_FAIL: 0x200,
    DUPLICATE: 0x400,
    SUPPLEMENTARY: 0x800
  };

  function BamFile() {}

  // Calculate the length (in bytes) of the BAI ref starting at offset.
  // Returns {nbin, length, minBlockIndex}
  function _getBaiRefLength(uncba, offset) {
    var p = offset;
    var nbin = readInt(uncba, p);
    p += 4;

    for (var b = 0; b < nbin; ++b) {
      var bin = readInt(uncba, p);
      var nchnk = readInt(uncba, p + 4);
      p += 8 + (nchnk * 16);
    }

    var nintv = readInt(uncba, p);
    p += 4;

    var minBlockIndex = 1000000000;
    var q = p;

    for (var i = 0; i < nintv; ++i) {
      var v = readVob(uncba, q);
      q += 8;

      if (v) {
        var bi = v.block;
        if (v.offset > 0) {
          bi += 65536;
        }

        if (bi < minBlockIndex) {
          minBlockIndex = bi;
        }

        break;
      }
    }

    p += (nintv * 8);

    return {
      minBlockIndex: minBlockIndex,
      nbin: nbin,
      length: p - offset
    };
  }

  function makeBam(data, bai, indexChunks, callback, attempted) {
    // Do an initial probe on the BAM file to catch any mixed-content errors.
    data.slice(0, 10).fetch(function(header) {
      if (header) {
        return makeBam2(data, bai, indexChunks, callback, attempted);
      } else {
        return callback(null, "Couldn't access BAM.");
      }
    }, {
      timeout: 5000
    });
  }

  function makeBam2(data, bai, indexChunks, callback, attempted) {
    var bam = new BamFile();
    bam.data = data;
    bam.bai = bai;
    bam.indexChunks = indexChunks;

    var minBlockIndex = bam.indexChunks ? bam.indexChunks.minBlockIndex : 1000000000;

    // Fills out bam.chrToIndex and bam.indexToChr based on the first few bytes of the BAM.
    function parseBamHeader(r) {
      if (!r) {
        return callback(null, "Couldn't access BAM");
      }

      var unc = unbgzf(r, r.byteLength);
      var uncba = new Uint8Array(unc);

      var magic = readInt(uncba, 0);

      if (magic != BAM_MAGIC) {
        return callback(null, "Not a BAM file, magic=0x" + magic.toString(16));
      }

      var headLen = readInt(uncba, 4);
      var header = '';

      for (var i = 0; i < headLen; ++i) {
        header += String.fromCharCode(uncba[i + 8]);
      }

      var nRef = readInt(uncba, headLen + 8);
      var p = headLen + 12;

      bam.chrToIndex = {};
      bam.indexToChr = [];

      for (var i = 0; i < nRef; ++i) {
        var lName = readInt(uncba, p);
        var name = '';

        for (var j = 0; j < lName - 1; ++j) {
          name += String.fromCharCode(uncba[p + 4 + j]);
        }

        var lRef = readInt(uncba, p + lName + 4);
        bam.chrToIndex[name] = i;

        if (name.indexOf('chr') == 0) {
          bam.chrToIndex[name.substring(3)] = i;
        } else {
          bam.chrToIndex['chr' + name] = i;
        }

        bam.indexToChr.push(name);

        p = p + 8 + lName;
      }

      if (bam.indices) {
        return callback(bam);
      }
    }

    function parseBai(header) {
      if (!header) {
        return "Couldn't access BAI";
      }

      var uncba = new Uint8Array(header);
      var baiMagic = readInt(uncba, 0);

      if (baiMagic != BAI_MAGIC) {
        return callback(null, 'Not a BAI file, magic=0x' + baiMagic.toString(16));
      }

      var nref = readInt(uncba, 4);

      bam.indices = [];

      var p = 8;

      for (var ref = 0; ref < nref; ++ref) {
        var blockStart = p;
        var o = _getBaiRefLength(uncba, blockStart);
        p += o.length;

        minBlockIndex = Math.min(o.minBlockIndex, minBlockIndex);

        var nbin = o.nbin;

        if (nbin > 0) {
          bam.indices[ref] = new Uint8Array(header, blockStart, p - blockStart);
        }
      }

      return true;
    }

    if (!bam.indexChunks) {
      bam.bai.fetch(function(header) { // Do we really need to fetch the whole thing? :-(
        var result = parseBai(header);

        if (result !== true) {
          if (bam.bai.url && typeof(attempted) === "undefined") {
            // Already attempted x.bam.bai not there so now trying x.bai
            bam.bai.url = bam.data.url.replace(new RegExp('.bam$'), '.bai');

            // True lets us know we are making a second attempt
            makeBam2(data, bam.bai, indexChunks, callback, true);
          } else {
            // We've attempted x.bam.bai & x.bai and nothing worked
            callback(null, result);
          }
        } else {
          bam.data.slice(0, minBlockIndex).fetch(parseBamHeader);
        }
      }); // Timeout on first request to catch Chrome mixed-content error.
    } else {
      var chunks = bam.indexChunks.chunks;
      bam.indices = [];

      for (var i = 0; i < chunks.length; i++) {
        bam.indices[i] = null; // To be filled out lazily as needed
      }

      bam.data.slice(0, minBlockIndex).fetch(parseBamHeader);
    }
  }

  BamFile.prototype.blocksForRange = function(refId, min, max) {
    var index = this.indices[refId];
    if (!index) {
      return [];
    }

    var intBinsL = reg2bins(min, max);
    var intBins = [];

    for (var i = 0; i < intBinsL.length; ++i) {
      intBins[intBinsL[i]] = true;
    }

    var leafChunks = [], otherChunks = [];
    var nbin = readInt(index, 0);
    var p = 4;

    for (var b = 0; b < nbin; ++b) {
      var bin = readInt(index, p);
      var nchnk = readInt(index, p + 4);
      //        dlog('bin=' + bin + '; nchnk=' + nchnk);
      p += 8;

      if (intBins[bin]) {
        for (var c = 0; c < nchnk; ++c) {
          var cs = readVob(index, p);
          var ce = readVob(index, p + 8);
          (bin < 4681 ? otherChunks : leafChunks).push(new Chunk(cs, ce));
          p += 16;
        }
      } else {
        p += (nchnk * 16);
      }
    }

    // console.log('leafChunks = ' + miniJSONify(leafChunks));
    // console.log('otherChunks = ' + miniJSONify(otherChunks));

    var nintv = readInt(index, p);
    var lowest = null;
    var minLin = Math.min(min >> 14, nintv - 1), maxLin = Math.min(max >> 14, nintv - 1);

    for (var i = minLin; i <= maxLin; ++i) {
      var lb = readVob(index, p + 4 + (i * 8));

      if (!lb) {
        continue;
      }

      if (!lowest || lb.block < lowest.block || lb.offset < lowest.offset) {
        lowest = lb;
      }
    }

    // console.log('Lowest LB = ' + lowest);

    var prunedOtherChunks = [];

    if (lowest != null) {
      for (var i = 0; i < otherChunks.length; ++i) {
        var chnk = otherChunks[i];

        if (chnk.maxv.block >= lowest.block && chnk.maxv.offset >= lowest.offset) {
          prunedOtherChunks.push(chnk);
        }
      }
    }

    // console.log('prunedOtherChunks = ' + miniJSONify(prunedOtherChunks));
    otherChunks = prunedOtherChunks;

    var intChunks = [];

    for (var i = 0; i < otherChunks.length; ++i) {
      intChunks.push(otherChunks[i]);
    }

    for (var i = 0; i < leafChunks.length; ++i) {
      intChunks.push(leafChunks[i]);
    }

    intChunks.sort(function(c0, c1) {
      var dif = c0.minv.block - c1.minv.block;

      if (dif != 0) {
        return dif;
      } else {
        return c0.minv.offset - c1.minv.offset;
      }
    });

    var mergedChunks = [];

    if (intChunks.length > 0) {
      var cur = intChunks[0];

      for (var i = 1; i < intChunks.length; ++i) {
        var nc = intChunks[i];

        if (nc.minv.block == cur.maxv.block /* && nc.minv.offset == cur.maxv.offset */ ) { // no point splitting mid-block
          cur = new Chunk(cur.minv, nc.maxv);
        } else {
          mergedChunks.push(cur);
          cur = nc;
        }
      }

      mergedChunks.push(cur);
    }

    // console.log('mergedChunks = ' + miniJSONify(mergedChunks));

    return mergedChunks;
  };

  BamFile.prototype.fetch = function(chr, min, max, callback, opts) {
    var thisB = this;
    opts = opts || {};

    var chrId = this.chrToIndex[chr];
    var chunks;

    if (chrId === undefined) {
      chunks = [];
    } else {
      // Fetch this portion of the BAI if it hasn't been loaded yet.
      if (this.indices[chrId] === null && this.indexChunks.chunks[chrId]) {
        var start_stop = this.indexChunks.chunks[chrId];

        return this.bai.slice(start_stop[0], start_stop[1]).fetch(function(data) {
          var buffer = new Uint8Array(data);
          this.indices[chrId] = buffer;
          return this.fetch(chr, min, max, callback, opts);
        }.bind(this));
      }

      chunks = this.blocksForRange(chrId, min, max);

      if (!chunks) {
        callback(null, 'Error in index fetch');
      }
    }

    var records = [];
    var index = 0;
    var data;

    function tramp() {
      if (index >= chunks.length) {
        return callback(records);
      } else if (!data) {
        var c = chunks[index];
        var fetchMin = c.minv.block;
        var fetchMax = c.maxv.block + (1 << 16); // *sigh*
        // console.log('fetching ' + fetchMin + ':' + fetchMax);
        thisB.data.slice(fetchMin, fetchMax - fetchMin).fetch(function(r) {
          data = unbgzf(r, c.maxv.block - c.minv.block + 1);
          return tramp();
        });
      } else {
        var ba = new Uint8Array(data);
        var finished = thisB.readBamRecords(ba, chunks[index].minv.offset, records, min, max, chrId, opts);
        data = null;
        ++index;

        if (finished) {
          return callback(records);
        } else {
          return tramp();
        }
      }
    }

    tramp();
  };

  var SEQRET_DECODER = ['=', 'A', 'C', 'x', 'G', 'x', 'x', 'x', 'T', 'x', 'x', 'x', 'x', 'x', 'x', 'N'];
  var CIGAR_DECODER = ['M', 'I', 'D', 'N', 'S', 'H', 'P', '=', 'X', '?', '?', '?', '?', '?', '?', '?'];

  function BamRecord() {}

  BamFile.prototype.readBamRecords = function(ba, offset, sink, min, max, chrId, opts) {
    while (true) {
      var blockSize = readInt(ba, offset);
      var blockEnd = offset + blockSize + 4;

      if (blockEnd >= ba.length) {
        return false;
      }

      var record = new BamRecord();

      var refID = readInt(ba, offset + 4);
      var pos = readInt(ba, offset + 8);

      var bmn = readInt(ba, offset + 12);
      var bin = (bmn & 0xffff0000) >> 16;
      var mq = (bmn & 0xff00) >> 8;
      var nl = bmn & 0xff;

      var flag_nc = readInt(ba, offset + 16);
      var flag = (flag_nc & 0xffff0000) >> 16;
      var nc = flag_nc & 0xffff;

      var lseq = readInt(ba, offset + 20);

      var nextRef = readInt(ba, offset + 24);
      var nextPos = readInt(ba, offset + 28);

      var tlen = readInt(ba, offset + 32);

      record.segment = this.indexToChr[refID];
      record.flag = flag;
      record.pos = pos;
      record.mq = mq;

      if (opts.light) {
        record.seqLength = lseq;
      }

      if (!opts.light) {
        if (nextRef >= 0) {
          record.nextSegment = this.indexToChr[nextRef];
          record.nextPos = nextPos;
        }

        var readName = '';

        for (var j = 0; j < nl - 1; ++j) {
          readName += String.fromCharCode(ba[offset + 36 + j]);
        }

        record.readName = readName;

        var p = offset + 36 + nl;

        var cigar = '';

        for (var c = 0; c < nc; ++c) {
          var cigop = readInt(ba, p);
          cigar = cigar + (cigop >> 4) + CIGAR_DECODER[cigop & 0xf];
          p += 4;
        }

        record.cigar = cigar;

        var seq = '';
        var seqBytes = (lseq + 1) >> 1;

        for (var j = 0; j < seqBytes; ++j) {
          var sb = ba[p + j];
          seq += SEQRET_DECODER[(sb & 0xf0) >> 4];

          if (seq.length < lseq) {
            seq += SEQRET_DECODER[(sb & 0x0f)];
          }
        }

        p += seqBytes;
        record.seq = seq;

        var qseq = '';

        for (var j = 0; j < lseq; ++j) {
          qseq += String.fromCharCode(ba[p + j] + 33);
        }

        p += lseq;
        record.quals = qseq;

        while (p < blockEnd) {
          var tag = String.fromCharCode(ba[p], ba[p + 1]);
          var type = String.fromCharCode(ba[p + 2]);
          var value;

          if (type == 'A') {
            value = String.fromCharCode(ba[p + 3]);
            p += 4;
          } else if (type == 'i' || type == 'I') {
            value = readInt(ba, p + 3);
            p += 7;
          } else if (type == 'c' || type == 'C') {
            value = ba[p + 3];
            p += 4;
          } else if (type == 's' || type == 'S') {
            value = readShort(ba, p + 3);
            p += 5;
          } else if (type == 'f') {
            value = readFloat(ba, p + 3);
            p += 7;
          } else if (type == 'Z' || type == 'H') {
            p += 3;
            value = '';

            for (;;) {
              var cc = ba[p++];

              if (cc == 0) {
                break;
              } else {
                value += String.fromCharCode(cc);
              }
            }
          } else if (type == 'B') {
            var atype = String.fromCharCode(ba[p + 3]);
            var alen = readInt(ba, p + 4);
            var elen;
            var reader;

            if (atype == 'i' || atype == 'I' || atype == 'f') {
              elen = 4;

              if (atype == 'f') {
                reader = readFloat;
              } else {
                reader = readInt;
              }
            } else if (atype == 's' || atype == 'S') {
              elen = 2;
              reader = readShort;
            } else if (atype == 'c' || atype == 'C') {
              elen = 1;
              reader = readByte;
            } else {
              throw 'Unknown array type ' + atype;
            }

            p += 8;
            value = [];

            for (var i = 0; i < alen; ++i) {
              value.push(reader(ba, p));
              p += elen;
            }
          } else {
            throw 'Unknown type ' + type;
          }

          record[tag] = value;
        }
      }

      if (!min || record.pos <= max && record.pos + lseq >= min) {
        if (chrId === undefined || refID == chrId) {
          sink.push(record);
        }
      }

      if (record.pos > max) {
        return true;
      }

      offset = blockEnd;
    }

    // Exits via top of loop.
  };

  /*-------------------------------------------------------------------------------------------------------------------------------*/

  window.dallianceLib = {
    URLFetchable  : URLFetchable,
    BlobFetchable : BlobFetchable,
    makeBam       : makeBam
  };
})();