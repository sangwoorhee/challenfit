// multer-s3 타입 정의
declare namespace Express {
    namespace MulterS3 {
      interface File extends Multer.File {
        location: string;
        bucket: string;
        key: string;
        acl: string;
        contentType: string;
        contentDisposition: null;
        contentEncoding: null;
        storageClass: string;
        serverSideEncryption: null;
        metadata: any;
        etag: string;
      }
    }
  }