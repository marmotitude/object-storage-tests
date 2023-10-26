FROM fczuardi/object-storage-tests:latest
RUN apk add \
      mandoc mandoc-doc \
      rclone-doc rclone-fish-completion \
      openssh openssh-doc \
      vim vim-doc \
      git git-doc \
      fish fish-doc \
      ripgrep ripgrep-doc ripgrep-fish-completion \
      bat bat-doc bat-fish-completion \
      chezmoi chezmoi-fish-completion \
